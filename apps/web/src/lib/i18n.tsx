"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type Locale = "en" | "zh";

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

const STORAGE_KEY = "aiastro-locale";

function getInitialLocale(): Locale {
  if (typeof window === "undefined") return "en";
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "zh" || stored === "en") return stored;
  } catch {}
  const browserLang = navigator.language;
  if (browserLang.startsWith("zh")) return "zh";
  return "en";
}

/* ─── translations ─── */

const en: Record<string, string> = {
  // Home
  "home.subtitle": "AI-native Astrologer Workspace",
  "home.birthData": "New Client",
  "home.name": "Name",
  "home.date": "Date",
  "home.timeLocal": "Time (local)",
  "home.birthPlace": "Birth Place",
  "home.birthPlacePlaceholder": "e.g. Beijing, Paris",
  "home.selectPlace": "Please select a birth place from the search results.",
  "home.calculating": "Calculating…",
  "home.createChart": "View Chart",
  "home.sessions": "Sessions",
  "home.pastSessions": "History",
  "home.unnamedSession": "Unnamed chart",
  "home.loading": "Loading…",
  "home.view": "View",
  "home.query": "Query",
  "home.noSessions": "No sessions yet",
  "home.deleteSessionAria": "Delete session",
  "home.deleteSessionTitle": "Delete this chart?",
  "home.deleteSessionBody":
    "This removes birth data, the chart, theme hints, and all chat history for this person. This cannot be undone.",
  "home.cancel": "Cancel",
  "home.deleteConfirm": "Delete",
  "home.deleteFailed": "Could not delete. Try again.",
  "home.editSessionAria": "Edit birth data",
  "home.editFailed": "Could not load or remove the old chart. Nothing was changed.",

  // Session workspace
  "session.backToSessions": "Back to home",
  "session.view": "View",
  "session.query": "Query",

  // View page
  "view.loading": "Loading…",
  "view.loadError": "Could not load session",
  "view.backHome": "Back to home",
  "view.defaultTitle": "Chart",
  "view.themeHints": "Theme hints",
  "view.generatingThemes": "Generating theme hints in the background… This page updates automatically.",
  "view.themeFailed": "Theme generation did not complete. You can retry (still uses your saved chart features only).",
  "view.retrying": "Retrying…",
  "view.retry": "Retry",
  "view.starting": "Starting…",
  "view.generateThemes": "Generate themes",
  "view.noThemes": "No themes yet; they should appear shortly after opening a new chart.",
  "view.overallPriorities": "Overall priorities",
  "view.priority": "Priority:",

  // Chart settings
  "settings.title": "Birth Chart Settings",
  "settings.saving": "Saving…",
  "settings.close": "Close settings",
  "settings.visiblePoints": "Visible points",
  "settings.aspectOrbs": "Aspect orbs (°)",
  "settings.orbHelp": "Type 0–15 (decimals allowed). Invalid values are flagged; valid entries save when you leave the field.",
  "settings.resetDefaults": "Reset to defaults",
  "settings.keepOnePoint": "Keep at least one point",

  // Birth place picker
  "place.searching": "Searching…",
  "place.tzFailed": "Time zone lookup failed",
  "place.searchFailed": "Place search failed",

  // Elements & modalities
  "ring.ariaLabel": "Elements and modalities distribution",
  "ring.distribution": "{title} distribution",
  "ring.elements": "Elements",
  "ring.modalities": "Modalities",
  "ring.fire": "Fire",
  "ring.earth": "Earth",
  "ring.air": "Air",
  "ring.water": "Water",
  "ring.cardinal": "Cardinal",
  "ring.fixed": "Fixed",
  "ring.mutable": "Mutable",

  // Chart features grid
  "features.stelliums": "Stelliums",
  "features.noStellium": "No classical stellium detected (3+ planets in one sign).",
  "features.houseEmphasis": "House emphasis",
  "features.dominantPlanets": "Dominant planets",
  "features.majorAspects": "Major aspects",
  "features.showLess": "Show less",
  "features.showMore": "Show {count} more",
  "features.majorAspectGeneric": "Major aspect between two chart points.",

  // Aspect help
  "aspect.conjunction.title": "Conjunction",
  "aspect.conjunction.text": "0° — merged themes, emphasis, and shared focus between the two bodies.",
  "aspect.opposition.title": "Opposition",
  "aspect.opposition.text": "180° — polarity and awareness through contrast; tension that clarifies balance.",
  "aspect.trine.title": "Trine",
  "aspect.trine.text": "120° — harmonious flow, natural support, and ease between the two points.",
  "aspect.square.title": "Square",
  "aspect.square.text": "90° — friction and growth through challenge; energy that asks for adjustment.",
  "aspect.sextile.title": "Sextile",
  "aspect.sextile.text": "60° — opportunity and light cooperation; openings when you lean in.",

  // Houses
  "house.1.title": "1st house",
  "house.1.text": "Self-presentation, body, beginnings",
  "house.2.title": "2nd house",
  "house.2.text": "Money, resources, values, security",
  "house.3.title": "3rd house",
  "house.3.text": "Learning, siblings, neighborhood, communication",
  "house.4.title": "4th house",
  "house.4.text": "Home, family, roots, private life",
  "house.5.title": "5th house",
  "house.5.text": "Creativity, romance, play, children",
  "house.6.title": "6th house",
  "house.6.text": "Work, health, habits, service",
  "house.7.title": "7th house",
  "house.7.text": "Partnership, contracts, open enemies",
  "house.8.title": "8th house",
  "house.8.text": "Shared resources, intimacy, change, crisis",
  "house.9.title": "9th house",
  "house.9.text": "Beliefs, travel, higher learning, meaning",
  "house.10.title": "10th house",
  "house.10.text": "Career, status, vocation, visibility",
  "house.11.title": "11th house",
  "house.11.text": "Friends, groups, hopes, networks",
  "house.12.title": "12th house",
  "house.12.text": "Solitude, subconscious, healing, closure",

  // Session query / chat
  "chat.clearConversation": "Clear conversation",
  "chat.placeholder": "What's on your mind about this chart?",
  "chat.stopRecording": "Stop recording",
  "chat.voiceInput": "Voice input",
  "chat.send": "Send",
  "chat.startExploring": "Start exploring {name}",
  "chat.thisChart": "this chart",
  "chat.chartStructures": "Chart Structures",
  "chat.interpretation": "Interpretation",
  "chat.suggestedFollowups": "Suggested Follow-ups",
  "chat.chipChartOverview": "Chart & Overview",
  "chat.chipLifeDirection": "Life & Direction",
  "chat.chipLoveRelationships": "Love & Relationships",
  "chat.chipCareerAmbition": "Career & Ambition",
  "chat.chipFamilyHome": "Family & Home",
  "chat.chipStrengthsChallenges": "Strengths & Challenges",
  "chat.noMic": "This browser does not support microphone recording.",
  "chat.recordingError": "Recording error. Please try again.",
  "chat.micPermission": "Could not access the microphone. Check your permissions.",
  "chat.tooShort": "Recording too short. Please try again.",
  "chat.sttFailed": "Speech recognition failed.",

  // Session layout
  "sessionLayout.loading": "Loading…",

  // Body / point full names
  "body.Sun": "Sun",
  "body.Moon": "Moon",
  "body.Mercury": "Mercury",
  "body.Venus": "Venus",
  "body.Mars": "Mars",
  "body.Jupiter": "Jupiter",
  "body.Saturn": "Saturn",
  "body.Uranus": "Uranus",
  "body.Neptune": "Neptune",
  "body.Pluto": "Pluto",
  "body.True_North_Lunar_Node": "North Node",
  "body.True_South_Lunar_Node": "South Node",
  "body.Ascendant": "Ascendant",
  "body.Descendant": "Descendant",
  "body.Medium_Coeli": "Medium Coeli",
  "body.Imum_Coeli": "Imum Coeli",
  "body.Chiron": "Chiron",
  "body.Mean_Lilith": "Lilith",

  // Body short labels (wheel SVG)
  "body.short.Sun": "Sun",
  "body.short.Moon": "Mon",
  "body.short.Mercury": "Mer",
  "body.short.Venus": "Ven",
  "body.short.Mars": "Mar",
  "body.short.Jupiter": "Jup",
  "body.short.Saturn": "Sat",
  "body.short.Uranus": "Ura",
  "body.short.Neptune": "Nep",
  "body.short.Pluto": "Plu",
  "body.short.True_North_Lunar_Node": "NN",
  "body.short.True_South_Lunar_Node": "SN",
  "body.short.Ascendant": "ASC",
  "body.short.Descendant": "DES",
  "body.short.Medium_Coeli": "MC",
  "body.short.Imum_Coeli": "IC",
  "body.short.Chiron": "Chi",
  "body.short.Mean_Lilith": "Lil",

  // Planet keywords (body detail modal)
  "keyword.Sun": "Vitality, identity, conscious will",
  "keyword.Moon": "Emotions, needs, instinctive patterns",
  "keyword.Mercury": "Mind, speech, learning, curiosity",
  "keyword.Venus": "Values, affection, harmony, pleasure",
  "keyword.Mars": "Drive, assertion, courage, desire",
  "keyword.Jupiter": "Growth, meaning, opportunity, faith",
  "keyword.Saturn": "Structure, limits, maturity, responsibility",
  "keyword.Uranus": "Freedom, innovation, disruption, truth",
  "keyword.Neptune": "Imagination, compassion, transcendence, blur",
  "keyword.Pluto": "Power, transformation, depth, letting go",
  "keyword.True_North_Lunar_Node": "Direction, growth edge, unfamiliar pull",
  "keyword.True_South_Lunar_Node": "Habit, release, familiar patterns",
  "keyword.Ascendant": "Persona, approach to life, first impressions",
  "keyword.Descendant": "Partnership, projection, one-to-one bonds",
  "keyword.Medium_Coeli": "Calling, reputation, public path",
  "keyword.Imum_Coeli": "Roots, private life, inner foundation",
  "keyword.Chiron": "Wound, healing, mentoring arc",
  "keyword.Mean_Lilith": "Wild instinct, taboo edge, raw desire",

  // Zodiac sign full names (index 0–11)
  "zodiac.0": "Aries",
  "zodiac.1": "Taurus",
  "zodiac.2": "Gemini",
  "zodiac.3": "Cancer",
  "zodiac.4": "Leo",
  "zodiac.5": "Virgo",
  "zodiac.6": "Libra",
  "zodiac.7": "Scorpio",
  "zodiac.8": "Sagittarius",
  "zodiac.9": "Capricorn",
  "zodiac.10": "Aquarius",
  "zodiac.11": "Pisces",

  // Zodiac short labels (wheel band)
  "zodiac.short.0": "ARI",
  "zodiac.short.1": "TAU",
  "zodiac.short.2": "GEM",
  "zodiac.short.3": "CAN",
  "zodiac.short.4": "LEO",
  "zodiac.short.5": "VIR",
  "zodiac.short.6": "LIB",
  "zodiac.short.7": "SCO",
  "zodiac.short.8": "SAG",
  "zodiac.short.9": "CAP",
  "zodiac.short.10": "AQU",
  "zodiac.short.11": "PIS",

  // Zodiac trait keywords (joined per sign)
  "zodiac.traits.0": "Courage · Initiative · Directness · Pioneering",
  "zodiac.traits.1": "Stability · Patience · Sensuality · Endurance",
  "zodiac.traits.2": "Curiosity · Versatility · Connection · Play of ideas",
  "zodiac.traits.3": "Nurturing · Intuition · Protection · Emotional depth",
  "zodiac.traits.4": "Warmth · Creativity · Pride · Generous spirit",
  "zodiac.traits.5": "Precision · Service · Analysis · Refinement",
  "zodiac.traits.6": "Balance · Harmony · Partnership · Aesthetic sense",
  "zodiac.traits.7": "Intensity · Depth · Loyalty · Transformation",
  "zodiac.traits.8": "Exploration · Optimism · Freedom · Meaning-seeking",
  "zodiac.traits.9": "Ambition · Discipline · Structure · Long view",
  "zodiac.traits.10": "Innovation · Independence · Humanity · Detachment",
  "zodiac.traits.11": "Compassion · Imagination · Fluidity · Transcendence",

  // Wheel UI labels
  "wheel.sign": "Sign",
  "wheel.house": "House",
  "wheel.cusp": "Cusp",
  "wheel.ruler": "Traditional ruler",
  "wheel.retrograde": "Retrograde",
  "wheel.inHouse": "in the {n}",
  "wheel.ariaLabel": "Birth chart wheel",
  "wheel.houseTitle": "House {n}",

  // Settings group names
  "settings.group.Planets": "Planets",
  "settings.group.Nodes": "Nodes",
  "settings.group.Angles": "Angles",
  "settings.group.Other": "Other",

  // Aspect orb labels
  "orb.conjunction": "Conjunction",
  "orb.sextile": "Sextile",
  "orb.square": "Square",
  "orb.trine": "Trine",
  "orb.opposition": "Opposition",

  // Chart header
  "header.sunMoonAsc": "Sun, Moon, and Ascendant signs",
  "header.sunIn": "Sun in {sign}",
  "header.moonIn": "Moon in {sign}",
  "header.ascIn": "Ascendant in {sign}",
  "header.sun": "Sun",
  "header.moon": "Moon",
  "header.asc": "ASC",

  // Stellium tooltip
  "stellium.label": "{sign} stellium",

  // Language toggle
  "lang.toggle": "中文",
  "lang.switchAria": "Switch language",
};

const zh: Record<string, string> = {
  // Home
  "home.subtitle": "AI 原生占星师工作台",
  "home.birthData": "新建个案",
  "home.name": "姓名",
  "home.date": "日期",
  "home.timeLocal": "时间（当地）",
  "home.birthPlace": "出生地",
  "home.birthPlacePlaceholder": "例如 北京、巴黎",
  "home.selectPlace": "请从搜索结果中选择一个出生地。",
  "home.calculating": "正在计算…",
  "home.createChart": "查看星盘",
  "home.sessions": "会话列表",
  "home.pastSessions": "历史",
  "home.unnamedSession": "未命名",
  "home.loading": "加载中…",
  "home.view": "查看",
  "home.query": "问答",
  "home.noSessions": "暂无会话",
  "home.deleteSessionAria": "删除会话",
  "home.deleteSessionTitle": "删除这张星盘？",
  "home.deleteSessionBody":
    "将删除出生数据、星盘、主题提示以及与此人相关的全部聊天记录，且无法恢复。",
  "home.cancel": "取消",
  "home.deleteConfirm": "删除",
  "home.deleteFailed": "删除失败，请重试。",
  "home.editSessionAria": "编辑出生信息",
  "home.editFailed": "无法载入或移除旧星盘，未做任何更改。",

  // Session workspace
  "session.backToSessions": "返回首页",
  "session.view": "星盘",
  "session.query": "问答",

  // View page
  "view.loading": "加载中…",
  "view.loadError": "无法加载会话",
  "view.backHome": "返回首页",
  "view.defaultTitle": "星盘",
  "view.themeHints": "主题提示",
  "view.generatingThemes": "正在后台生成主题提示… 页面会自动更新。",
  "view.themeFailed": "主题生成未完成。你可以重试（仅使用已保存的星盘特征）。",
  "view.retrying": "正在重试…",
  "view.retry": "重试",
  "view.starting": "正在启动…",
  "view.generateThemes": "生成主题",
  "view.noThemes": "暂无主题；打开新星盘后会自动生成。",
  "view.overallPriorities": "总体优先级",
  "view.priority": "优先级：",

  // Chart settings
  "settings.title": "星盘设置",
  "settings.saving": "保存中…",
  "settings.close": "关闭设置",
  "settings.visiblePoints": "可见星体",
  "settings.aspectOrbs": "相位容许度 (°)",
  "settings.orbHelp": "输入 0–15（允许小数）。无效值会标记；有效值在离开输入框时自动保存。",
  "settings.resetDefaults": "恢复默认",
  "settings.keepOnePoint": "至少保留一个星体",

  // Birth place picker
  "place.searching": "搜索中…",
  "place.tzFailed": "时区查询失败",
  "place.searchFailed": "地点搜索失败",

  // Elements & modalities
  "ring.ariaLabel": "元素与模式分布",
  "ring.distribution": "{title}分布",
  "ring.elements": "元素",
  "ring.modalities": "模式",
  "ring.fire": "火",
  "ring.earth": "土",
  "ring.air": "风",
  "ring.water": "水",
  "ring.cardinal": "开创",
  "ring.fixed": "固定",
  "ring.mutable": "变动",

  // Chart features grid
  "features.stelliums": "群星",
  "features.noStellium": "未检测到经典群星（同一星座 3 颗以上行星）。",
  "features.houseEmphasis": "宫位重点",
  "features.dominantPlanets": "主导行星",
  "features.majorAspects": "主要相位",
  "features.showLess": "收起",
  "features.showMore": "展开 {count} 个",
  "features.majorAspectGeneric": "两个星盘点之间的主要相位。",

  // Aspect help
  "aspect.conjunction.title": "合相",
  "aspect.conjunction.text": "0° — 主题融合、强调与两颗星体之间的共同焦点。",
  "aspect.opposition.title": "对冲",
  "aspect.opposition.text": "180° — 通过对比的极性与觉察；澄清平衡的张力。",
  "aspect.trine.title": "三分相",
  "aspect.trine.text": "120° — 和谐流动、自然支持与两个点之间的融洽。",
  "aspect.square.title": "四分相",
  "aspect.square.text": "90° — 通过挑战的摩擦与成长；需要调整的能量。",
  "aspect.sextile.title": "六分相",
  "aspect.sextile.text": "60° — 机会与轻度合作；当你投入时打开的门。",

  // Houses
  "house.1.title": "第一宫",
  "house.1.text": "自我表现、身体、开端",
  "house.2.title": "第二宫",
  "house.2.text": "金钱、资源、价值观、安全感",
  "house.3.title": "第三宫",
  "house.3.text": "学习、兄弟姐妹、邻里、沟通",
  "house.4.title": "第四宫",
  "house.4.text": "家庭、家族、根源、私人生活",
  "house.5.title": "第五宫",
  "house.5.text": "创造力、恋爱、娱乐、子女",
  "house.6.title": "第六宫",
  "house.6.text": "工作、健康、习惯、服务",
  "house.7.title": "第七宫",
  "house.7.text": "合作关系、合同、公开的敌人",
  "house.8.title": "第八宫",
  "house.8.text": "共享资源、亲密关系、变革、危机",
  "house.9.title": "第九宫",
  "house.9.text": "信仰、旅行、高等教育、意义",
  "house.10.title": "第十宫",
  "house.10.text": "事业、地位、职业、能见度",
  "house.11.title": "第十一宫",
  "house.11.text": "朋友、团体、希望、人脉",
  "house.12.title": "第十二宫",
  "house.12.text": "独处、潜意识、疗愈、了结",

  // Session query / chat
  "chat.clearConversation": "清除对话",
  "chat.placeholder": "关于这张星盘，你想问什么？",
  "chat.stopRecording": "停止录音",
  "chat.voiceInput": "语音输入",
  "chat.send": "发送",
  "chat.startExploring": "开始探索 {name}",
  "chat.thisChart": "这张星盘",
  "chat.chartStructures": "星盘结构",
  "chat.interpretation": "解读",
  "chat.suggestedFollowups": "推荐追问",
  "chat.chipChartOverview": "星盘概览",
  "chat.chipLifeDirection": "人生方向",
  "chat.chipLoveRelationships": "感情与关系",
  "chat.chipCareerAmbition": "事业与志向",
  "chat.chipFamilyHome": "家庭与居所",
  "chat.chipStrengthsChallenges": "优势与挑战",
  "chat.noMic": "此浏览器不支持麦克风录音。",
  "chat.recordingError": "录音错误，请重试。",
  "chat.micPermission": "无法访问麦克风，请检查权限。",
  "chat.tooShort": "录音太短，请重试。",
  "chat.sttFailed": "语音识别失败。",

  // Session layout
  "sessionLayout.loading": "加载中…",

  // Body / point full names
  "body.Sun": "太阳",
  "body.Moon": "月亮",
  "body.Mercury": "水星",
  "body.Venus": "金星",
  "body.Mars": "火星",
  "body.Jupiter": "木星",
  "body.Saturn": "土星",
  "body.Uranus": "天王星",
  "body.Neptune": "海王星",
  "body.Pluto": "冥王星",
  "body.True_North_Lunar_Node": "北交点",
  "body.True_South_Lunar_Node": "南交点",
  "body.Ascendant": "上升点",
  "body.Descendant": "下降点",
  "body.Medium_Coeli": "天顶",
  "body.Imum_Coeli": "天底",
  "body.Chiron": "凯龙星",
  "body.Mean_Lilith": "莉莉丝",

  // Body short labels (wheel SVG)
  "body.short.Sun": "日",
  "body.short.Moon": "月",
  "body.short.Mercury": "水",
  "body.short.Venus": "金",
  "body.short.Mars": "火",
  "body.short.Jupiter": "木",
  "body.short.Saturn": "土",
  "body.short.Uranus": "天",
  "body.short.Neptune": "海",
  "body.short.Pluto": "冥",
  "body.short.True_North_Lunar_Node": "北交",
  "body.short.True_South_Lunar_Node": "南交",
  "body.short.Ascendant": "ASC",
  "body.short.Descendant": "DES",
  "body.short.Medium_Coeli": "MC",
  "body.short.Imum_Coeli": "IC",
  "body.short.Chiron": "凯龙",
  "body.short.Mean_Lilith": "莉莉",

  // Planet keywords (body detail modal)
  "keyword.Sun": "生命力、自我认同、意志",
  "keyword.Moon": "情绪、需求、本能模式",
  "keyword.Mercury": "思维、言语、学习、好奇",
  "keyword.Venus": "价值观、情感、和谐、享乐",
  "keyword.Mars": "驱动力、行动力、勇气、欲望",
  "keyword.Jupiter": "成长、意义、机遇、信念",
  "keyword.Saturn": "结构、限制、成熟、责任",
  "keyword.Uranus": "自由、创新、颠覆、真相",
  "keyword.Neptune": "想象力、慈悲、超越、模糊",
  "keyword.Pluto": "权力、蜕变、深度、放手",
  "keyword.True_North_Lunar_Node": "方向、成长边缘、陌生的牵引",
  "keyword.True_South_Lunar_Node": "习性、释放、熟悉的模式",
  "keyword.Ascendant": "人格面具、生活态度、第一印象",
  "keyword.Descendant": "合作关系、投射、一对一纽带",
  "keyword.Medium_Coeli": "天命、声望、公共道路",
  "keyword.Imum_Coeli": "根源、私人生活、内在根基",
  "keyword.Chiron": "伤痛、疗愈、导师之路",
  "keyword.Mean_Lilith": "野性本能、禁忌边缘、原始欲望",

  // Zodiac sign full names (index 0–11)
  "zodiac.0": "白羊座",
  "zodiac.1": "金牛座",
  "zodiac.2": "双子座",
  "zodiac.3": "巨蟹座",
  "zodiac.4": "狮子座",
  "zodiac.5": "处女座",
  "zodiac.6": "天秤座",
  "zodiac.7": "天蝎座",
  "zodiac.8": "射手座",
  "zodiac.9": "摩羯座",
  "zodiac.10": "水瓶座",
  "zodiac.11": "双鱼座",

  // Zodiac short labels (wheel band)
  "zodiac.short.0": "白羊",
  "zodiac.short.1": "金牛",
  "zodiac.short.2": "双子",
  "zodiac.short.3": "巨蟹",
  "zodiac.short.4": "狮子",
  "zodiac.short.5": "处女",
  "zodiac.short.6": "天秤",
  "zodiac.short.7": "天蝎",
  "zodiac.short.8": "射手",
  "zodiac.short.9": "摩羯",
  "zodiac.short.10": "水瓶",
  "zodiac.short.11": "双鱼",

  // Zodiac trait keywords (joined per sign)
  "zodiac.traits.0": "勇气 · 开创 · 直率 · 先驱",
  "zodiac.traits.1": "稳定 · 耐心 · 感官 · 坚韧",
  "zodiac.traits.2": "好奇 · 多变 · 连结 · 思想碰撞",
  "zodiac.traits.3": "滋养 · 直觉 · 保护 · 情感深度",
  "zodiac.traits.4": "温暖 · 创造力 · 骄傲 · 慷慨",
  "zodiac.traits.5": "精确 · 服务 · 分析 · 雅致",
  "zodiac.traits.6": "平衡 · 和谐 · 合作 · 审美",
  "zodiac.traits.7": "强烈 · 深度 · 忠诚 · 蜕变",
  "zodiac.traits.8": "探索 · 乐观 · 自由 · 追寻意义",
  "zodiac.traits.9": "野心 · 纪律 · 结构 · 远见",
  "zodiac.traits.10": "创新 · 独立 · 人道 · 超然",
  "zodiac.traits.11": "同情 · 想象 · 流动 · 超越",

  // Wheel UI labels
  "wheel.sign": "星座",
  "wheel.house": "宫位",
  "wheel.cusp": "宫头",
  "wheel.ruler": "传统守护星",
  "wheel.retrograde": "逆行",
  "wheel.inHouse": "在{n}",
  "wheel.ariaLabel": "本命星盘",
  "wheel.houseTitle": "第{n}宫",

  // Settings group names
  "settings.group.Planets": "行星",
  "settings.group.Nodes": "月交点",
  "settings.group.Angles": "轴点",
  "settings.group.Other": "其他",

  // Aspect orb labels
  "orb.conjunction": "合相",
  "orb.sextile": "六分相",
  "orb.square": "四分相",
  "orb.trine": "三分相",
  "orb.opposition": "对冲",

  // Chart header
  "header.sunMoonAsc": "太阳、月亮与上升星座",
  "header.sunIn": "太阳在{sign}",
  "header.moonIn": "月亮在{sign}",
  "header.ascIn": "上升在{sign}",
  "header.sun": "太阳",
  "header.moon": "月亮",
  "header.asc": "上升",

  // Stellium tooltip
  "stellium.label": "{sign}群星",

  // Language toggle
  "lang.toggle": "EN",
  "lang.switchAria": "切换语言",
};

const dictionaries: Record<Locale, Record<string, string>> = { en, zh };

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setLocaleState(getInitialLocale());
    setMounted(true);
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {}
    document.documentElement.lang = l === "zh" ? "zh-CN" : "en";
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      let str = dictionaries[locale]?.[key] ?? dictionaries.en[key] ?? key;
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          str = str.replace(`{${k}}`, String(v));
        }
      }
      return str;
    },
    [locale],
  );

  if (!mounted) {
    const tServer = (key: string, params?: Record<string, string | number>): string => {
      let str = dictionaries.en[key] ?? key;
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          str = str.replace(`{${k}}`, String(v));
        }
      }
      return str;
    };
    return (
      <I18nContext.Provider value={{ locale: "en", setLocale, t: tServer }}>
        {children}
      </I18nContext.Provider>
    );
  }

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within LocaleProvider");
  return ctx;
}
