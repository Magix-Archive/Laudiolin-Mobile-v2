module.exports = (api) => {
    api.cache(true);
    return {
        presets: ["babel-preset-expo"],
        plugins: [
            [
                "module-resolver",
                {
                    alias: {
                        "@app": "./src",
                        "@ui": "./src/ui",
                        "@style": "./src/ui/style",
                        "@hooks": "./src/ui/hooks",
                        "@widgets": "./src/ui/widgets",
                        "@components": "./src/ui/components",
                        "@modals": "./src/ui/modals",
                        "@backend": "./src/backend",
                        "@assets": "./assets",
                    }
                }
            ]
        ]
    };
};
