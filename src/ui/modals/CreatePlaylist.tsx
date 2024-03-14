// noinspection RequiredAttributes

import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { logger } from "react-native-logs";
import { NavigationProp, useNavigation } from "@react-navigation/native";
import { MediaTypeOptions, launchImageLibraryAsync } from "expo-image-picker";

import Toggle from "react-native-toggle-element";

import OrDivider from "@components/OrDivider";
import StyledText from "@components/StyledText";
import StyledModal from "@components/StyledModal";
import StyledButton from "@components/StyledButton";
import StyledTextInput from "@components/StyledTextInput";

import Playlist from "@backend/playlist";

import { colors, value } from "@style/Laudiolin";
import { pickIcon } from "@backend/utils";
import StyledToggle from "@components/StyledToggle";

const log = logger.createLogger();

interface IProps {
    visible: boolean;
    hide: () => void;
}

function CreatePlaylist(props: IProps) {
    const navigation: NavigationProp<any> = useNavigation();

    const [name, setName] = useState("");
    const [isPrivate, setPrivate] = useState(true);
    const [cover, setCover] = useState<string | null>(null); // This is a Base64 image string.

    const [useImport, setImport] = useState(false);

    const [importUrl, setImportUrl] = useState("");

    return (
        <StyledModal
            visible={props.visible}
            onPressOutside={props.hide}
            style={style.CreatePlaylist}
            title={"Create Playlist"}
        >
            { useImport ? <>
                <StyledTextInput
                    default={"Playlist URL"}
                    defaultColor={colors.gray}
                    textStyle={style.CreatePlaylist_Text}
                    inputStyle={{ borderBottomColor: "transparent" }}
                    containerStyle={style.CreatePlaylist_Input}
                    onChange={setImportUrl}
                />

                <StyledButton
                    text={"Import"}
                    style={style.CreatePlaylist_Button}
                    buttonStyle={{ backgroundColor: colors.accent }}
                    onPress={async () => {
                        if (importUrl == "") return;

                        const [success, playlistId] = await Playlist.createPlaylist(importUrl);
                        if (success) {
                            props.hide();
                            navigation.navigate("Playlist", { playlistId });
                        } else {
                            log.warn("Unable to import playlist.");
                        }
                    }}
                />

                <OrDivider />

                <StyledButton
                    text={"Create a Playlist"}
                    style={style.CreatePlaylist_Button}
                    buttonStyle={{ backgroundColor: colors.accent }}
                    onPress={() => setImport(false)}
                />
            </> : <>
                <View style={{
                    gap: 10,
                    width: "100%",
                    alignItems: "center",
                    flexDirection: "column"
                }}>
                    <StyledTextInput
                        default={"Playlist Name"}
                        defaultColor={colors.gray}
                        textStyle={style.CreatePlaylist_Text}
                        inputStyle={{ borderBottomColor: "transparent" }}
                        containerStyle={style.CreatePlaylist_Input}
                        onChange={setName}
                    />

                    <StyledButton
                        text={"Set Playlist Cover"}
                        style={style.CreatePlaylist_Button}
                        buttonStyle={{ backgroundColor: colors.accent }}
                        onPress={async () => {
                            const result = await pickIcon();
                            if (!result.canceled) {
                                setCover(result.assets[0].base64 ?? "");
                            }
                        }}
                    />

                    <StyledToggle
                        value={isPrivate}
                        onPress={setPrivate}
                        title={"Private Playlist?"}
                    />
                </View>

                <StyledButton
                    text={"Create"}
                    style={style.CreatePlaylist_Button}
                    buttonStyle={{ backgroundColor: colors.accent }}
                    onPress={async () => {
                        if (name == "") return;

                        const [success, playlistId] = await Playlist.createPlaylist({
                            name, isPrivate,
                            description: "My wonderful playlist!",
                            icon: "https://i.pinimg.com/564x/e2/26/98/e22698a130ad38d08d3b3d650c2cb4b3.jpg",
                            tracks: []
                        });
                        if (success) {
                            props.hide();
                            navigation.navigate("Playlist", { playlistId });
                        } else {
                            log.warn("Unable to create playlist.");
                        }
                    }}
                />

                <OrDivider />

                <StyledButton
                    text={"Import a Playlist"}
                    style={style.CreatePlaylist_Button}
                    buttonStyle={{ backgroundColor: colors.accent }}
                    onPress={() => setImport(true)}
                />
            </> }
        </StyledModal>
    );
}

export default CreatePlaylist;

const style = StyleSheet.create({
    CreatePlaylist: {
        gap: 15,
        width: value.width * 0.8
    },
    CreatePlaylist_Input: {
        backgroundColor: colors.primary,
        borderRadius: 10
    },
    CreatePlaylist_Text: {
        textAlign: "center"
    },
    CreatePlaylist_Button: {
        width: "100%",
        borderRadius: 10
    }
});
