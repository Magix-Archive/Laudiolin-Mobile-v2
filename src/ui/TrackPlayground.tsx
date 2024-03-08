import { useState } from "react";
import { TextInput, View } from "react-native";

import { NavigationProp } from "@react-navigation/native";

import StyledButton from "@components/StyledButton";

import { search } from "@backend/search";
import { blank_SearchResult, SearchResult } from "@backend/types";
import Track from "@widgets/Track";

interface IProps {
    navigation: NavigationProp<any>;
}

function TrackPlayground({ navigation }: IProps) {
    const [query, setQuery] = useState("hikaru nara");

    const [results, setResults] = useState<SearchResult>(blank_SearchResult);

    return (
        <View style={{ gap: 35, padding: 15 }}>
            <StyledButton
                text={"Go Back"}
                onPress={() => navigation.goBack()}
            />

            <View style={{ gap: 15 }}>
                <TextInput
                    style={{
                        color: "white", borderColor: "white", borderWidth: 1, width: "80%",
                        alignSelf: "center", textAlign: "center"
                    }}
                    onChange={e => setQuery(e.nativeEvent.text)}
                >
                    {query}
                </TextInput>

                {
                    results.top != null &&
                    <Track data={results.top} style={{ alignSelf: "center" }} />
                }
            </View>

            <StyledButton
                text={"Do Search"}
                onPress={async() => setResults(await search(query))}
            />
        </View>
    );
}

export default TrackPlayground;