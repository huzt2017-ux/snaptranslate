import xtranslator from "xtranslator";
import type { setting } from "../../ShareTypes";

type TranslatorSetting = setting["翻译"]["翻译器"][0];

export function getTranslatorEngineType(type: TranslatorSetting["type"]) {
    return (type === "llm" || type === "openaiCompatible"
        ? "chatgpt"
        : type) as keyof typeof xtranslator.es;
}

export function getOpenAICompatibleKeys(
    keys: TranslatorSetting["keys"],
) {
    const rawConfig = keys.config;
    const config: { model: string; [key: string]: unknown } = {
        ...(rawConfig &&
        typeof rawConfig === "object" &&
        !Array.isArray(rawConfig)
            ? rawConfig
            : {}),
        model: String(keys.model ?? "").trim(),
    };

    let url = String(keys.url ?? "").trim();
    if (url && !/\/chat\/completions\/?$/.test(url)) {
        url = `${url.replace(/\/+$/, "")}/chat/completions`;
    }

    return {
        key: String(keys.key ?? "").trim(),
        ...(url ? { url } : {}),
        config,
    };
}

export function loadTranslator(
    store: typeof import("../../../lib/store/renderStore")["default"],
) {
    const transE = store.get("翻译.翻译器");

    if (transE.length > 0) {
        const x = transE[0];
        const e = getTranslators(store, x);
        if (e) {
            const lan = store.get("屏幕翻译.语言");
            return (input: string[]) =>
                e.run(
                    input,
                    (lan.from ||
                        "auto") as (typeof xtranslator.languages.normal)[number],
                    (lan.to ||
                        store.get(
                            "语言.语言",
                        )) as (typeof xtranslator.languages.normal)[number],
                );
        }
    }
}

export function getTranslators(
    store: typeof import("../../../lib/store/renderStore")["default"],
    settingItem: TranslatorSetting,
): InstanceType<(typeof xtranslator)["Translator"]> | undefined {
    const e = xtranslator.es[getTranslatorEngineType(settingItem.type)]();
    if (e) {
        if (settingItem.type === "llm") {
            const model = store
                .get("AI.在线模型")
                .find((i) => i.name === settingItem.keys.name);
            if (!model) {
                return;
            }
            // @ts-ignore
            e.setKeys({
                url: new URL("chat/completions", model.url).toString(),
                key: model.key,
                config: {
                    model: model.model,
                },
            });
        } else if (settingItem.type === "openaiCompatible") {
            // @ts-ignore
            e.setKeys(getOpenAICompatibleKeys(settingItem.keys));
            // @ts-ignore
        } else e.setKeys(settingItem.keys);
        return e;
    }
    return undefined;
}