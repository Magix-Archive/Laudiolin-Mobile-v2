import { useEffect, useState } from "react";
import { ScrollView, StyleProp, View, ViewStyle } from "react-native";

import * as Updates from "expo-updates";
import { logger } from "react-native-logs";
import { useNavigation } from "@react-navigation/native";
import TrackPlayer, { RepeatMode, useActiveTrack, usePlaybackState } from "react-native-track-player";

import ImportTrack from "@modals/ImportTrack";

import StyledText from "@components/StyledText";
import StyledButton from "@components/StyledButton";

import { Colors, useColor, useDebug } from "@backend/stores";
import Player, { usePlayer, useQueue } from "@backend/player";

import { value } from "@style/Laudiolin";
import Gateway from "@backend/gateway";

const log = logger.createLogger();

function color(enabled: boolean, colors: Colors): StyleProp<ViewStyle> {
    return { backgroundColor: enabled ? "green" : colors.accent };
}

function Debug() {
    const debug = useDebug();
    const colors = useColor();
    const player = usePlayer();

    const navigation = useNavigation();

    const playingTrack = useActiveTrack();
    const playerState = usePlaybackState();

    const [queueInfo, showQueueInfo] = useState(false);
    const [trackInfo, showTrackInfo] = useState(false);
    const [newQueueInfo, setNewQueueInfo] = useState(false);
    const [showGateway, setShowGateway] = useState(false);

    const [showImport, setShowImport] = useState(false);

    const [repeatMode, setRepeatMode] = useState(RepeatMode.Off);
    const [songIndex, setSongIndex] = useState<number | undefined>(0);

    const queue = useQueue();

    return (
        <ScrollView
            style={{
                padding: value.padding,
                marginBottom: 50
            }}
            contentContainerStyle={{ gap: 15 }}
        >
            <StyledButton
                text={"Go Back"}
                onPress={() => navigation.goBack()}
            />

            <StyledButton
                text={"Check for Updates"}
                onPress={async () => {
                    try {
                        const update = await Updates.checkForUpdateAsync();
                        if (update.isAvailable) {
                            await Updates.fetchUpdateAsync();
                            await Updates.reloadAsync();
                        }
                    } catch (error) {
                        log.error("Error checking for updates", error);
                    }
                }}
            />

            <StyledButton
                text={"Log Playback State"}
                buttonStyle={color(debug.playbackState, colors)}
                onPress={() => debug.update({ playbackState: !debug.playbackState })}
            />

            { debug.playbackState && (
                <View style={{ gap: 10 }}>
                    <StyledText text={`Playback state: ${playerState.state}`} bold />
                </View>
            ) }

            <StyledButton
                text={"Log Track Info"}
                buttonStyle={color(debug.trackInfo, colors)}
                onPress={() => debug.update({ trackInfo: !debug.trackInfo })}
            />

            <StyledButton
                text={"Show Queue Info"}
                buttonStyle={color(queueInfo, colors)}
                onPress={() => showQueueInfo(!queueInfo)}
            />

            { queueInfo && (
                <View style={{ gap: 10 }}>
                    <StyledButton
                        text={"Clear Queue"}
                        onPress={() => TrackPlayer.removeUpcomingTracks()}
                    />
                    <StyledButton
                        text={`Current Song: ${songIndex}`}
                        onPress={() => TrackPlayer.getActiveTrackIndex().then(setSongIndex)}
                    />
                    <StyledButton
                        text={`Current Repeat: ${repeatMode}`}
                        onPress={() => {
                            Player.nextRepeatMode().then(setRepeatMode);
                        }}
                    />
                </View>
            ) }

            <StyledButton
                text={"Show New Queue Info"}
                buttonStyle={color(newQueueInfo, colors)}
                onPress={() => setNewQueueInfo(!newQueueInfo)}
            />

            { newQueueInfo && (
                <View style={{ gap: 10 }}>
                    <StyledText text={`Songs in queue: ${queue.size()}`} bold />
                    <StyledText text={`Next Song: ${queue.peek()?.title ?? "No song in queue"}`} />
                    <StyledText text={`Currently playing song: ${player.track?.title ?? "None"}`} />

                    <StyledButton
                        text={`Current Repeat: ${repeatMode}`}
                        onPress={() => {
                            Player.nextRepeatMode().then(setRepeatMode);
                        }}
                    />

                    <StyledButton
                        text={"Remove Element"}
                        onPress={() => queue.dequeue()}
                    />
                </View>
            ) }

            <StyledButton
                text={"Show Track Info"}
                buttonStyle={color(trackInfo, colors)}
                onPress={() => showTrackInfo(!trackInfo)}
            />

            { trackInfo && (
                <View style={{ gap: 10 }}>
                    <StyledText text={`Current track: ${playingTrack?.title ?? "None"}`} />
                    <StyledText text={`Current artist: ${playingTrack?.artist ?? "None"}`} />
                </View>
            ) }

            <StyledButton
                text={"Import Local"}
                onPress={() => setShowImport(true)}
            />

            <StyledButton
                text={"Show Gateway Info"}
                buttonStyle={color(showGateway, colors)}
                onPress={() => setShowGateway(!showGateway)}
            />

            { showGateway && <GatewayInfo /> }

            <ImportTrack opened={showImport} close={() => setShowImport(false)} />
        </ScrollView>
    );
}

export default Debug;

function GatewayInfo() {
    const colors = useColor();

    const [messages, setMessages] = useState<string[]>([]);

    useEffect(() => {
        const socket = Gateway.socket();
        if (!socket) return undefined;

        const listener = ({ data }: MessageEvent) => {
            setMessages(prev => [...prev, data]);
        };
        socket.addEventListener("message", listener);

        return () => {
            socket.removeEventListener("message", listener);
        };
    }, []);

    return (
        <View style={{ gap: 10 }}>
            <StyledText text={`Connected? ${Gateway.connected()}`} bold />

            <ScrollView
                style={{
                    padding: 10, backgroundColor: colors.secondary,
                    borderRadius: 10, height: 100
                }}
            >
                {messages.map((message, index) => (
                    <StyledText text={message} key={index} />
                ))}
            </ScrollView>
        </View>
    );
}
