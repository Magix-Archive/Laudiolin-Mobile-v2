import { create, StoreApi, UseBoundStore } from "zustand";

import { logger } from "react-native-logs";
import TrackPlayer, { AddTrack, Event, RepeatMode, State } from "react-native-track-player";

import Queue from "@backend/Queue";

import Backend from "@backend/backend";
import { resolveIcon } from "@backend/utils";
import { useDebug, useGlobal } from "@backend/stores";
import { PlaylistInfo, TrackInfo } from "@backend/types";

const log = logger.createLogger();

const requestData = {
    userAgent: "seiKiMo/Laudiolin-Mobile",
    contentType: "audio/mpeg"
};

/**
 * Adds event listeners to the track player.
 */
export const PlaybackService = async () => {
    TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
    TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());
    TrackPlayer.addEventListener(Event.RemoteStop, () => TrackPlayer.stop());
    TrackPlayer.addEventListener(Event.RemoteNext, () => skipToNext());
    TrackPlayer.addEventListener(Event.RemotePrevious, () => skipToPrevious());
    TrackPlayer.addEventListener(Event.RemoteSeek, ({ position }) => TrackPlayer.seekTo(position));

    TrackPlayer.addEventListener(Event.PlaybackState, (data) => {
        if (data == undefined || data.state == undefined) {
            TrackPlayer.reset();
            return;
        }

        if (useDebug.getState().playbackState) {
            log.info(`Playback state changed: ${data.state}`);
        }

        if (data.state == State.Error) {
            const state = useGlobal.getState();
            if (state.loadTries > 3) {
                log.error("Failed to load track after 3 tries.");
                TrackPlayer.reset();

                useGlobal.setState({ loadTries: 0 });
                skipToNext();
            } else {
                state.incrementTries();
                TrackPlayer.retry();
            }
        }
    });
    TrackPlayer.addEventListener(Event.PlaybackState, async (data) => {
        if (data == undefined || data.state == undefined) return;
        const state = data.state;

        if (state == State.Ended) {
            // Remove the currently playing song.
            await TrackPlayer.setQueue([]);

            // Add the next song to the player.
            const queue = useQueue.getState();
            if (queue.isEmpty()) {
                await TrackPlayer.stop();
            } else {
                await play(queue.dequeue());
            }
        }
    });
};

type PlayerType = {
    track: TrackInfo | undefined;
    started: number;

    isPaused(): Promise<boolean>;
    setTrack(track: TrackInfo): void;
};

/**
 * Creates a player object.
 */
function Player(): UseBoundStore<StoreApi<PlayerType>> {
    return create<PlayerType>((set) => ({
        track: undefined,
        started: Date.now(),

        async isPaused(): Promise<boolean> {
            const { state } = await TrackPlayer.getPlaybackState();
            return state == State.Paused;
        },
        setTrack(track: TrackInfo) {
            set({ track, started: Date.now() });
        }
    }));
}

export const usePlayer = Player();

const backQueue = Queue<TrackInfo>();
export const useQueue = Queue<TrackInfo>();

/**
 * Transforms a track info into a track player track.
 *
 * @param track The track to transform.
 */
function transform(track: TrackInfo): AddTrack {
    return track.type == "remote" ?
        {
            ...requestData,
            id: track.id,
            url: `${Backend.getBaseUrl()}/download?id=${track.id}`,
            title: track.title,
            artist: track.artist,
            artwork: resolveIcon(track.icon)
        }
        :
        {
            id: track.id,
            url: track.filePath,
            title: track.title,
            artist: track.artist,
            artwork: track.icon
        };
}

type PlayProps = {
    playlist?: PlaylistInfo; // Track source playlist.
    reset?: boolean; // Should the player be reset?
    clear?: boolean; // Should the existing queue be cleared?
    shuffle?: boolean; // Should the queue be shuffled?
};

/**
 * Plays the track.
 *
 * @param _track The track to play.
 * @param props Additional parameters.
 */
async function play(
    _track?: TrackInfo | TrackInfo[], props?: PlayProps
): Promise<void> {
    const { track: currentlyPlaying, setTrack } = usePlayer.getState();

    if (useDebug.getState().trackInfo) {
        log.info("Playing track:", _track);
    }

    let track = Array.isArray(_track) ? [..._track] : _track;

    if (props?.playlist) {
        useGlobal.setState({ fromPlaylist: props.playlist.name });
    } else {
        useGlobal.setState({ fromPlaylist: null })
    }

    props?.reset && await TrackPlayer.reset();

    if (!track) {
        // Check if a track is queued.
        const queue = useQueue.getState();
        if (!queue.isEmpty()) {
            // Add the next track to the player.
            const next = queue.dequeue();
            if (!next) return;

            return await play(next);
        }

        // Use the internal method to resume playback.
        return await TrackPlayer.play();
    }

    // Check if the queue should be cleared.
    if (props?.clear) {
        useQueue.getState().clear();
    }
    // Check if the list should be shuffled.
    const isArray = Array.isArray(track);
    if (props?.shuffle && isArray) {
        track = (track as TrackInfo[])
            .sort(() => Math.random() - 0.5);
    }

    // Check if there is a song playing.
    const { state } = await TrackPlayer.getPlaybackState();
    if (state == State.None) {
        // Handle player loop state.
        const repeat = await TrackPlayer.getRepeatMode();
        if (repeat == RepeatMode.Track) {
            // Repeat the song.
            return await TrackPlayer.seekTo(0);
        } else if (repeat == RepeatMode.Queue) {
            // Add the track to the queue.
            currentlyPlaying && useQueue.getState().enqueue(currentlyPlaying);
        }

        // Add the track to the player.
        let toPlay: TrackInfo;
        if (isArray) {
            const tracks = track as TrackInfo[];
            toPlay = tracks[0];
            useQueue.getState().enqueue(tracks.slice(1));
        } else {
            toPlay = track as TrackInfo;
        }

        try {
            // Add the current track to the back queue.
            currentlyPlaying && backQueue.getState()
                .enqueue(currentlyPlaying);

            await TrackPlayer.add(transform(toPlay));
            await TrackPlayer.play();
            setTrack(toPlay);
        } catch (error) {
            log.warn("Failed to play track:", error);
        }
    } else {
        // Add the track to the queue.
        useQueue.getState().enqueue(track);
    }
}

/**
 * Shuffles the track queue.
 */
function shuffle(): void {
    useQueue.getState().shuffle();
}

const nextRepeat = {
    [RepeatMode.Off]: RepeatMode.Queue,
    [RepeatMode.Queue]: RepeatMode.Track,
    [RepeatMode.Track]: RepeatMode.Off
};

/**
 * Sets the player to the next repeat mode.
 *
 * @return The new repeat mode.
 */
async function nextRepeatMode(): Promise<RepeatMode> {
    const mode = await TrackPlayer.getRepeatMode();
    const next = nextRepeat[mode];
    await TrackPlayer.setRepeatMode(next);
    return next;
}

/**
 * Skips to the next track in the queue.
 */
async function skipToNext(): Promise<void> {
    await play(undefined, { reset: true });
}

/**
 * Skips to the previous track in the queue.
 */
async function skipToPrevious(): Promise<void> {
    const { track: currentlyPlaying } = usePlayer.getState();

    const track = backQueue.getState().dequeue();
    if (!track) return;

    // Add the current track to the queue.
    currentlyPlaying && useQueue.getState().enqueue(currentlyPlaying);

    await play(track, { reset: true });
}

/**
 * Sync the local player with the server.
 *
 * @param track The track to play.
 * @param progress The track progress.
 * @param paused If the track is paused.
 * @param seek The track seek position.
 */
async function sync(
    track: TrackInfo | null,
    progress: number,
    paused: boolean,
    seek: boolean
): Promise<void> {
    const { track: currentlyPlaying } = usePlayer.getState();

    // Reset the player if the track is null.
    if (track === null) {
        await TrackPlayer.reset();
        return;
    }

    // Check if the track needs to be played.
    if (currentlyPlaying?.id != track.id) {
        await play(track, { reset: true });
    }

    // Set the progress.
    seek && await TrackPlayer.seekTo(progress);

    // Set the player's state.
    if (paused) {
        await TrackPlayer.pause();
    } else {
        await TrackPlayer.play();
    }
}

export default {
    play,
    shuffle,
    nextRepeatMode,
    skipToNext,
    skipToPrevious,
    sync
};
