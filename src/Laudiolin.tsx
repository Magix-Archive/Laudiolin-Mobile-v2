import { SafeAreaView, StatusBar } from "react-native";

import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";

import Home from "@app/Home";

import Search from "@ui/Search";
import Settings from "@ui/Settings";

import style from "@style/Laudiolin";
import { HomeIcon, SearchIcon, SettingsIcon } from "@ui/Icons";

interface IProps {
    onLoad?: () => void;
}

const Tab = createBottomTabNavigator();

function Laudiolin(props: IProps) {
    return (
        <>
            <StatusBar barStyle={"light-content"} />

            <SafeAreaView style={style.App} onLayout={props.onLoad}>
                <NavigationContainer>
                    <Tab.Navigator
                        screenOptions={{
                            headerShown: false,
                            tabBarShowLabel: false,
                            tabBarStyle: style.App_TabBar,
                        }}
                        sceneContainerStyle={style.App_Scene}
                    >
                        <Tab.Screen options={{ tabBarIcon: ({ focused }) => HomeIcon(focused) }}
                                    name={"Home"} component={Home} />
                        <Tab.Screen options={{ tabBarIcon: ({ focused }) => SearchIcon(focused) }}
                                    name={"Search"} component={Search} />
                        <Tab.Screen options={{ tabBarIcon: ({ focused }) => SettingsIcon(focused) }}
                                    name={"Settings"} component={Settings} />
                    </Tab.Navigator>
                </NavigationContainer>
            </SafeAreaView>
        </>
    );
}

export default Laudiolin;