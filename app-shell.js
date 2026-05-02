(function () {
    var prefetched = new Set();
    var STATE_KEY = "njc_sermon_player_v1";
    var SPLASH_KEY = "njc_splash_seen_v1";
    var THEME_KEY = "njc_theme_v1";
    var THEME_PALETTE_KEY = "njc_theme_palette_v1";
    var LANGUAGE_KEY = "njc_language_v1";
    var FONT_EN_KEY = "njc_font_preset_en_v1";
    var FONT_TA_KEY = "njc_font_preset_ta_v1";
    var FONT_PANEL_OPEN_KEY = "njc_font_settings_panel_open_v1";
    var NOTIFICATION_SETTINGS_KEY = "njc_notification_settings_v1";
    var NOTIFICATION_SENT_KEY = "njc_notification_sent_v1";
    var CARD_LANGUAGE_MAP_KEY = "njc_card_language_map_v1";
    var PROFILE_STORAGE_KEY = "njc_user_profiles_v1";
    var NOTIFICATION_LAST_SERMON_KEY = "njc_notification_last_sermon_v1";
    var NOTIFICATION_LAST_PRAYER_KEY = "njc_notification_last_prayer_v1";
    var NOTIFICATION_LAST_MAILBOX_KEY = "njc_notification_last_mailbox_v1";
    var NOTIFICATION_LAST_NOTICE_KEY = "njc_notification_last_notice_v1";
    var NOTIFICATION_LAST_BROADCAST_KEY = "njc_notification_last_broadcast_v1";
    var INAPP_NOTIFICATION_KEY = "njc_inapp_notifications_v1";
    var FCM_REG_STATE_KEY = "njc_fcm_reg_state_v1";
    var NJC_BROADCAST_PUSH_REGION = "europe-west1";
    var EVENTS_FEED_URL = "https://raw.githubusercontent.com/simsonpeter/njcbelgium/refs/heads/main/events.json";
    var SERMONS_FEED_URL = "https://raw.githubusercontent.com/simsonpeter/njcbelgium/refs/heads/main/sermons.json";
    var ADMIN_SERMONS_URL = "https://mantledb.sh/v2/njc-belgium-admin-sermons/entries";
    var PRAYER_WALL_FEED_URL = "https://mantledb.sh/v2/njc-belgium-prayer-wall/entries";
    var CONTACT_FORM_FEED_URL = "https://mantledb.sh/v2/njc-belgium-contact-messages/entries";
    var ADMIN_NOTICES_FEED_URL = "https://mantledb.sh/v2/njc-belgium-admin-notices/entries";
    var ADMIN_BROADCASTS_FEED_URL = "https://mantledb.sh/v2/njc-belgium-admin-broadcasts/entries";
    var ADMIN_EMAIL = "simsonpeter@gmail.com";
    var activeLanguage = "en";
    var notificationIntervalId = null;
    var tamilTranslations = {
        "brand.name": "புதிய எருசலேம் சபை",
        "nav.home": "முகப்பு",
        "nav.about": "பற்றி",
        "nav.prayer": "ஜெபம்",
        "nav.events": "நிகழ்வுகள்",
        "nav.sermons": "பிரசங்கம்",
        "nav.songbook": "பாடல் தொகுப்பு",
        "nav.dailyBread": "அப்பம்",
        "nav.dailyBreadTab": "அப்பம்",
        "menu.bookShelf": "நூலகம்",
        "bookShelf.eyebrow": "நூலகம்",
        "bookShelf.title": "நூலகம்",
        "bookShelf.subtitle": "ஆங்கிலம் மற்றும் தமிழ்",
        "bookShelf.tabEnglish": "ஆங்கிலம்",
        "bookShelf.tabTamil": "தமிழ்",
        "bookShelf.loading": "ஏற்றுகிறது...",
        "bookShelf.empty": "இந்த நூலகத்தில் இன்னும் நூல்கள் இல்லை.",
        "bookShelf.error": "பட்டியலை ஏற்ற முடியவில்லை. பின்னர் முயற்சிக்கவும்.",
        "bookShelf.read": "வாசி",
        "bookShelf.download": "பதிவிறக்க",
        "bookShelf.untitled": "தலைப்பில்லை",
        "bookShelf.fileSizeAbout": "≈ {size} பதிவிறக்கம் (தோராயம்)",
        "bookShelf.fileSizeHint": "தோராயமான பதிவிறக்க அளவு",
        "menu.open": "பட்டியலை திற",
        "menu.title": "பட்டியல்",
        "menu.close": "பட்டியலை மூடு",
        "menu.bible": "வேதாகமம்",
        "menu.songbook": "பாடல் தொகுப்பு",
        "menu.trivia": "வேதாகமக் கேள்விகள்",
        "menu.userAchievements": "பயனர் சாதனைகள்",
        "menu.chat": "அரட்டை",
        "menu.kids": "சிறுவர் உலகம்",
        "menu.celebrations": "இன்றைய விழாக்கள்",
        "menu.profile": "சுயவிவரம்",
        "menu.profileGuest": "விருந்தினர்",
        "menu.mailbox": "அஞ்சல் பெட்டி",
        "menu.admin": "நிர்வாக பலகை",
        "menu.settings": "அமைப்புகள்",
        "menu.quickLanguage": "மொழி",
        "menu.quickTheme": "தீம்",
        "menu.contact": "தொடர்பு",
        "menu.login": "உள்நுழை / பதிவு",
        "menu.logout": "வெளியேறு",
        "auth.loginTitle": "உள்நுழை",
        "auth.registerTitle": "கணக்கு உருவாக்கு",
        "auth.entryTitle": "வரவேற்கிறோம்",
        "auth.entrySubtitle": "உள்நுழையவும் அல்லது உள்நுழையாமல் தொடரவும்.",
        "auth.loginAction": "உள்நுழை",
        "auth.registerAction": "கணக்கு உருவாக்கு",
        "auth.continueGuest": "உள்நுழையாமல் தொடரவும்",
        "auth.forgotPassword": "கடவுச்சொல் மறந்துவிட்டதா?",
        "auth.switchToRegister": "புதிய பயனர்? பதிவு செய்யவும்",
        "auth.switchToLogin": "ஏற்கனவே கணக்கா? உள்நுழையவும்",
        "auth.email": "மின்னஞ்சல்",
        "auth.password": "கடவுச்சொல் (குறைந்தது 6)",
        "auth.unavailable": "உள்நுழைவு இப்போது கிடைக்கவில்லை.",
        "auth.needCredentials": "மின்னஞ்சல் மற்றும் கடவுச்சொல்லை உள்ளிடவும்.",
        "auth.working": "காத்திருக்கவும்...",
        "auth.registered": "கணக்கு வெற்றிகரமாக உருவாக்கப்பட்டது.",
        "auth.regNormalPlusIntro": "புதிய கணக்குகள் இயல்பாக சாதாரண பயனர்: சபை பதிவுக்கு திறந்த பகுதிகளை மட்டும் பயன்படுத்தலாம். முழு சபை உறுப்பினர் அணுகலுக்கு உறுப்பினர் குறியீடு அல்லது நிர்வாகி தேவை.",
        "auth.loggedIn": "வெற்றிகரமாக உள்நுழைந்தீர்கள்.",
        "auth.failed": "உள்நுழைவு தோல்வி. மீண்டும் முயற்சிக்கவும்.",
        "auth.resetNeedEmail": "கடவுச்சொல் மாற்ற மின்னஞ்சலை முதலில் உள்ளிடவும்.",
        "auth.resetSent": "கடவுச்சொல் மாற்ற மின்னஞ்சல் அனுப்பப்பட்டது. உங்கள் inbox-ஐ பார்க்கவும்.",
        "auth.resetFailed": "மாற்ற மின்னஞ்சலை அனுப்ப முடியவில்லை. மீண்டும் முயற்சிக்கவும்.",
        "auth.emailInUse": "இந்த மின்னஞ்சல் ஏற்கனவே பயன்படுத்தப்பட்டுள்ளது.",
        "auth.invalidCredentials": "மின்னஞ்சல் அல்லது கடவுச்சொல் தவறு.",
        "auth.weakPassword": "கடவுச்சொல் குறைந்தது 6 எழுத்துகள் இருக்க வேண்டும்.",
        "auth.invalidEmail": "சரியான மின்னஞ்சலை உள்ளிடவும்.",
        "toggle.language.toTamil": "தமிழுக்கு மாற்று",
        "toggle.language.toEnglish": "Switch to English",
        "card.languageLabel": "அட்டை மொழி",
        "card.languageApp": "செயலி",
        "card.languageEnglish": "ஆங்கிலம்",
        "card.languageTamil": "தமிழ்",
        "toggle.theme.toLight": "ஒளி நிலைக்கு மாற்று",
        "toggle.theme.toDark": "இருள் நிலைக்கு மாற்று",
        "splash.main": "புதிய எருசலேம் சபை",
        "splash.sub": "பெல்ஜியம்",
        "home.welcomeBack": "நல்வரவு",
        "home.tagline": "உங்கள் வாராந்திர விசுவாசப் பயணம் ஒரே இடத்தில்.",
        "home.bibleReadingTitle": "இன்றைய வேத வாசிப்பு",
        "home.dailyVerseTitle": "இன்றைய வேத வசனம்",
        "home.dailyVerseToggleToTamil": "வசனத்தை தமிழில் காண்",
        "home.dailyVerseToggleToEnglish": "Show verse in English",
        "home.dailyVerseVersionEnglish": "KJV",
        "home.dailyVerseVersionTamil": "BSI (பழைய)",
        "home.dailyVerseEmptyBody": "இன்றைய வசனம் கிடைக்கவில்லை.",
        "home.dailyVerseLoading": "இன்றைய வசனம் ஏற்றப்படுகிறது...",
        "dailyBread.eyebrow": "அன்றன்றுள்ள அப்பம்",
        "dailyBread.title": "அன்றன்றுள்ள அப்பம்",
        "dailyBread.dateLine": "தேதி: {date}",
        "dailyBread.loading": "ஏற்றுகிறது...",
        "dailyBread.empty": "இன்றைக்கு உள்ளடக்கம் இல்லை.",
        "dailyBread.error": "ஏற்ற முடியவில்லை. பின்னர் முயற்சிக்கவும்.",
        "dailyBread.ttsListen": "கேட்க",
        "dailyBread.ttsPause": "இடைநிறுத்து",
        "dailyBread.ttsResume": "தொடரவும்",
        "dailyBread.ttsStop": "நிறுத்து",
        "dailyBread.ttsPlayAria": "அன்றன்றுள்ள அப்பத்தை கேட்க",
        "dailyBread.ttsStopAria": "ஒலியை நிறுத்து",
        "dailyBread.mediaSessionArtist": "NJC அன்றன்றுள்ள அப்பம்",
        "dailyBread.ttsUnsupported": "இந்த உலாவியில் பேச்சு ஒலி ஆதரவு இல்லை.",
        "dailyBread.ttsNoText": "கேட்க உரை இல்லை.",
        "dailyBread.byAuthor": "எழுத்தாளர்: {author}",
        "menu.dailyBread": "அன்றன்றுள்ள அப்பம்",
        "admin.scheduleHintBookShelf": "நூலகம்: ஆங்கிலம், தமிழ் அல்லது சிறுவர் உலகம். ஆங்கில/தமிழ் முக்கிய நூலகத்தில்; சிறுவர் உலகம் மட்டும் சிறுவர் உலகம் → புத்தகங்கள். பெட்டி njc-belgium-admin-library.",
        "admin.scheduleHintKidsAudio": "சிறுவர் உலகம் ஆடியோ: HTTPS ஆடியோ இணைப்புகளைச் சேர்; சிறுவர் உலகம் → ஆடியோவில் காட்டும். பெட்டி njc-belgium-kids-audio.",
        "admin.bookShelfTitle": "நூலகம்",
        "admin.bookShelfInfo": "ஆங்கிலம், தமிழ் அல்லது சிறுவர் உலகம் தேர்ந்தெடுக்கவும். சிறுவர் புத்தகங்கள் முக்கிய நூலகத்தில் தோன்றா — சிறுவர் உலகம் → புத்தகங்களில் மட்டும். கோப்பு மற்றும் விருப்ப முகப்பு படத்திற்கு https:// இணைப்புகளை ஒட்டவும். கோப்பு அளவை சேர்க்கவும்.",
        "admin.bookShelfShelfLegend": "தாவலில் காட்டு",
        "admin.bookShelfShelfEnglish": "ஆங்கில தாவல்",
        "admin.bookShelfShelfTamil": "தமிழ் தாவல்",
        "admin.bookShelfShelfKids": "சிறுவர் உலகம்",
        "admin.bookShelfTitleEnPlaceholder": "தலைப்பு (ஆங்கிலம்)",
        "admin.bookShelfTitleTaPlaceholder": "தலைப்பு (தமிழ், விருப்பம்)",
        "admin.bookShelfAuthorPlaceholder": "ஆசிரியர் (விருப்பம்)",
        "admin.bookShelfAuthorTaPlaceholder": "ஆசிரியர் (தமிழ், விருப்பம்)",
        "admin.bookShelfUrlPlaceholder": "கோப்பு URL (https://…)",
        "admin.bookShelfFileSizePlaceholder": "கோப்பு அளவு (எ.கா. 2.5 MB அல்லது 800 KB — விருப்பம்)",
        "admin.bookShelfDetectSize": "URL இலிருந்து கண்டுபிடி",
        "admin.bookShelfDetectSizeHint": "சில சேவையகங்கள் உலாவியைத் தடுக்கும்; அப்போது கைமுறையாக உள்ளிடவும்.",
        "admin.bookShelfDetectSizeWorking": "கண்டுபிடிக்கிறது…",
        "admin.bookShelfDetectSizeOk": "கோப்பு அளவு கண்டுபிடிக்கப்பட்டது. தயாரானதும் நூலைச் சேமிக்கவும்.",
        "admin.bookShelfDetectSizeFail": "அளவைக் கண்டுபிடிக்க முடியவில்லை (சேவையகம் தடுக்கலாம்). கைமுறையாக உள்ளிடவும்.",
        "admin.bookShelfCoverPlaceholder": "முகப்பு பட URL (https://…, விருப்பம்)",
        "admin.bookShelfFormatPlaceholder": "வடிவம் (விருப்பம்), எ.கா. pdf",
        "admin.bookShelfCategoryPlaceholder": "வகை (விருப்பம்)",
        "admin.bookShelfCategoryTaPlaceholder": "வகை (தமிழ், விருப்பம்)",
        "admin.bookShelfDescriptionPlaceholder": "குறுகிய விளக்கம் (விருப்பம்)",
        "admin.bookShelfDescriptionTaPlaceholder": "விளக்கம் (தமிழ், விருப்பம்)",
        "admin.bookShelfPublish": "நூலகத்தில் சேர்",
        "admin.bookShelfManageTitle": "நூலக உருப்படிகள்",
        "admin.bookShelfManageInfo": "திருத்த அல்லது நீக்க. புதுப்பி MantleDB-யிலிருந்து ஏற்றும்.",
        "admin.bookShelfEmptyTitle": "இன்னும் உருப்படிகள் இல்லை",
        "admin.bookShelfEmptyBody": "மேலே தலைப்பு மற்றும் கோப்பு URL சேர்க்கவும்.",
        "admin.bookShelfNeedTitle": "தலைப்பை உள்ளிடவும்.",
        "admin.bookShelfNeedUrl": "பாதுகாப்பான கோப்பு URL (https://…) உள்ளிடவும்.",
        "admin.bookShelfNeedCoverUrl": "முகப்பு படம் https:// அல்லது காலியாக விடவும்.",
        "admin.bookShelfNeedFileSize": "கோப்பு அளவு: எ.கா. 2.5 MB, 800 KB அல்லது பைட்டுகள். தெரியாவிட்டால் காலியாக விடவும்.",
        "admin.bookShelfListFileSize": "கோப்பு அளவு",
        "admin.bookShelfSaved": "நூலக உருப்படி சேர்க்கப்பட்டது.",
        "admin.bookShelfDeleted": "நீக்கப்பட்டது.",
        "admin.bookShelfUpdated": "புதுப்பிக்கப்பட்டது.",
        "admin.bookShelfDeleteConfirm": "இந்த உருப்படியை நீக்கவா?",
        "admin.kidsAudioTitle": "சிறுவர் உலகம் — ஆடியோ",
        "admin.kidsAudioInfo": "இவை சிறுவர் உலகம் → ஆடியோவில் தோன்றும். MP3 அல்லது பிற ஆடியோ கோப்புகளுக்கு நேரடி HTTPS இணைப்புகளை ஒட்டவும்.",
        "admin.kidsAudioTitleEnPlaceholder": "தலைப்பு (ஆங்கிலம்)",
        "admin.kidsAudioTitleTaPlaceholder": "தலைப்பு (தமிழ், விருப்பம்)",
        "admin.kidsAudioUrlPlaceholder": "ஆடியோ URL (https://… mp3, m4a, …)",
        "admin.kidsAudioCoverPlaceholder": "முகப்பு பட URL (https://…, விருப்பம்)",
        "admin.kidsAudioDurationPlaceholder": "கால அளவு (விருப்பம்), எ.கா. 4 நிமிடம்",
        "admin.kidsAudioSortPlaceholder": "வரிசை (விருப்பம்), சிறிய எண் முதலில்",
        "admin.kidsAudioDescPlaceholder": "குறுகிய விளக்கம் (விருப்பம்)",
        "admin.kidsAudioDescTaPlaceholder": "விளக்கம் (தமிழ், விருப்பம்)",
        "admin.kidsAudioPublish": "சிறுவர் ஆடியோவைச் சேர்",
        "admin.kidsAudioManageTitle": "சிறுவர் ஆடியோ உருப்படிகள்",
        "admin.kidsAudioManageInfo": "திருத்த அல்லது நீக்க. முதல் சேமிப்பு தோல்வியானால் MantleDB பெட்டி njc-belgium-kids-audio-ஐ உருவாக்கவும்.",
        "admin.kidsAudioEmptyTitle": "இன்னும் சிறுவர் ஆடியோ இல்லை",
        "admin.kidsAudioEmptyBody": "மேலே தலைப்பு மற்றும் ஆடியோ URL சேர்க்கவும்.",
        "admin.kidsAudioNeedTitle": "தலைப்பை உள்ளிடவும்.",
        "admin.kidsAudioNeedUrl": "பாதுகாப்பான ஆடியோ URL (https://…) உள்ளிடவும்.",
        "admin.kidsAudioNeedCoverUrl": "முகப்பு படம் https:// அல்லது காலியாக இருக்க வேண்டும்.",
        "admin.kidsAudioSaved": "சிறுவர் ஆடியோ சேர்க்கப்பட்டது.",
        "admin.kidsAudioDeleted": "நீக்கப்பட்டது.",
        "admin.kidsAudioUpdated": "புதுப்பிக்கப்பட்டது.",
        "admin.kidsAudioDeleteConfirm": "இந்த ஆடியோவை நீக்கவா?",
        "admin.kidsAudioEditTitle": "தலைப்பு (ஆங்கிலம்)",
        "admin.kidsAudioEditTitleTa": "தலைப்பு (தமிழ், விருப்பம்)",
        "admin.kidsAudioEditUrl": "ஆடியோ URL (https)",
        "admin.kidsAudioEditCover": "முகப்பு பட URL (https, விருப்பம்)",
        "admin.kidsAudioEditDuration": "கால அளவு லேபிள் (விருப்பம்)",
        "admin.kidsAudioEditSort": "வரிசை எண் (விருப்பம்)",
        "admin.kidsAudioEditDesc": "விளக்கம் (விருப்பம்)",
        "admin.kidsAudioEditDescTa": "விளக்கம் தமிழ் (விருப்பம்)",
        "admin.bookShelfBadgeEnglish": "ஆங்கில தாவல்",
        "admin.bookShelfBadgeTamil": "தமிழ் தாவல்",
        "admin.bookShelfBadgeKids": "சிறுவர் உலகம்",
        "admin.bookShelfEditPromptShelf": "தாவல்: en (ஆங்கிலம்), ta (தமிழ்), அல்லது kids (சிறுவர் உலகம்)",
        "admin.bookShelfEditPromptTitle": "தலைப்பு (EN)",
        "admin.bookShelfEditPromptTitleTa": "தலைப்பு (தமிழ், விருப்பம்)",
        "admin.bookShelfEditPromptAuthor": "ஆசிரியர் (விருப்பம்)",
        "admin.bookShelfEditPromptAuthorTa": "ஆசிரியர் தமிழ் (விருப்பம்)",
        "admin.bookShelfEditPromptUrl": "கோப்பு URL (https)",
        "admin.bookShelfEditPromptCover": "முகப்பு பட URL (https, விருப்பம்)",
        "admin.bookShelfEditPromptFileSize": "கோப்பு அளவு (எ.கா. 2.5 MB அல்லது 1200000 bytes, அழிக்க காலியாக)",
        "admin.bookShelfEditPromptFormat": "வடிவம் (விருப்பம், எ.கா. pdf)",
        "admin.bookShelfEditPromptCategory": "வகை (விருப்பம்)",
        "admin.bookShelfEditPromptCategoryTa": "வகை தமிழ் (விருப்பம்)",
        "admin.bookShelfEditPromptDesc": "விளக்கம் (விருப்பம்)",
        "admin.bookShelfEditPromptDescTa": "விளக்கம் தமிழ் (விருப்பம்)",
        "admin.scheduleHintDailyBread": "அன்றன்றுள்ள அப்பம்: தேதி சேர்த்து சேமிக்கவும்; Daily bread தாவல் இன்றைய பெல்ஜியம் தேதிக்கு காட்டும். MantleDB பெட்டி njc-belgium-admin-daily-bread தேவை.",
        "admin.dailyBreadTitle": "அன்றன்றுள்ள அப்பம் (தேதி)",
        "admin.dailyBreadInfo": "முன்கூட்டியே உள்ளடக்கம் சேர்க்கவும். ஒரு நாளுக்கு ஒரு பதிவு (YYYY-MM-DD). தமிழ் விருப்பம்.",
        "admin.dailyBreadTitleEnPlaceholder": "தலைப்பு (ஆங்கிலம்)",
        "admin.dailyBreadTitleTaPlaceholder": "தலைப்பு (தமிழ், விருப்பம்)",
        "admin.dailyBreadAuthorEnPlaceholder": "ஆசிரியர் (ஆங்கிலம், விருப்பம்)",
        "admin.dailyBreadAuthorTaPlaceholder": "ஆசிரியர் (தமிழ், விருப்பம்)",
        "admin.dailyBreadBodyEnPlaceholder": "உள்ளடக்கம் (ஆங்கிலம்). வரிகள் வைக்கப்படும்.",
        "admin.dailyBreadBodyTaPlaceholder": "உள்ளடக்கம் (தமிழ், விருப்பம்)",
        "admin.dailyBreadPublish": "அன்றன்றுள்ள அப்பம் சேமி",
        "admin.dailyBreadManageTitle": "திட்டமிடப்பட்ட அன்றன்றுள்ள அப்பம்",
        "admin.dailyBreadManageInfo": "தேதியால் திருத்த அல்லது நீக்க. புதுப்பி MantleDB-யிலிருந்து ஏற்றும்.",
        "admin.dailyBreadScheduledToggleAria": "திட்டமிடப்பட்ட அன்றன்றுள்ள அப்பம் பட்டியலை காட்டு அல்லது மறை",
        "admin.panelSectionToggleAria": "இந்தப் பகுதியை காட்டு அல்லது மறை",
        "admin.dailyBreadEmptyTitle": "பதிவுகள் இல்லை",
        "admin.dailyBreadEmptyBody": "மேலே படிவத்தில் சேர்க்கவும்.",
        "admin.dailyBreadNeedDate": "தேதியை உள்ளிடவும்.",
        "admin.dailyBreadNeedBody": "உள்ளடக்கத்தை உள்ளிடவும் (ஆங்கிலம் அல்லது தமிழ்).",
        "admin.dailyBreadSaved": "அன்றன்றுள்ள அப்பம் சேமிக்கப்பட்டது.",
        "admin.dailyBreadDeleted": "நீக்கப்பட்டது.",
        "admin.dailyBreadUpdated": "புதுப்பிக்கப்பட்டது.",
        "admin.dailyBreadDeleteConfirm": "இந்த தேதியின் பதிவை நீக்கவா?",
        "admin.dailyBreadEditPromptDate": "தேதியை திருத்து (YYYY-MM-DD)",
        "admin.dailyBreadEditPromptTitleEn": "தலைப்பை திருத்து (EN)",
        "admin.dailyBreadEditPromptTitleTa": "தலைப்பை திருத்து (TA, விருப்பம்)",
        "admin.dailyBreadEditPromptAuthorEn": "ஆசிரியரை திருத்து (EN, விருப்பம்)",
        "admin.dailyBreadEditPromptAuthorTa": "ஆசிரியரை திருத்து (TA, விருப்பம்)",
        "admin.dailyBreadEditPromptBodyEn": "உள்ளடக்கத்தை திருத்து (EN)",
        "admin.dailyBreadEditPromptBodyTa": "உள்ளடக்கத்தை திருத்து (TA, விருப்பம்)",
        "admin.scheduleHintLibrary": "நூலகம்: PDF அல்லது ஆவண இணைப்புகளை சேர்க்கவும்; மெனுவில் நூலகம் தோன்றும். MantleDB பெட்டி njc-belgium-admin-library தேவை.",
        "admin.libraryTitle": "நூலகம் (நூல்கள் மற்றும் PDF)",
        "admin.libraryInfo": "ஒவ்வொரு கோப்புக்கும் பொது https:// இணைப்பை ஒட்டவும் (PDF, TXT முதலியன). பயன்பாட்டில் மெனு → நூலகம் பட்டியல் காட்டும்.",
        "admin.libraryTitleEnPlaceholder": "தலைப்பு (ஆங்கிலம்)",
        "admin.libraryTitleTaPlaceholder": "தலைப்பு (தமிழ், விருப்பம்)",
        "admin.libraryAuthorPlaceholder": "ஆசிரியர் (விருப்பம்)",
        "admin.libraryAuthorTaPlaceholder": "ஆசிரியர் (தமிழ், விருப்பம்)",
        "admin.libraryUrlPlaceholder": "கோப்பு URL (https://…)",
        "admin.libraryCoverPlaceholder": "முகப்பு பட URL (https://…, விருப்பம்)",
        "admin.libraryFormatPlaceholder": "வடிவம் (விருப்பம்), எ.கா. pdf",
        "admin.libraryCategoryPlaceholder": "வகை (விருப்பம்)",
        "admin.libraryCategoryTaPlaceholder": "வகை (தமிழ், விருப்பம்)",
        "admin.libraryDescriptionPlaceholder": "குறுகிய விளக்கம் (விருப்பம்)",
        "admin.libraryDescriptionTaPlaceholder": "விளக்கம் (தமிழ், விருப்பம்)",
        "admin.libraryPublish": "நூலகத்தில் சேர்",
        "admin.libraryManageTitle": "நூலக உருப்படிகள்",
        "admin.libraryManageInfo": "திருத்த அல்லது நீக்க. புதுப்பி MantleDB-யிலிருந்து ஏற்றும்.",
        "admin.libraryEmptyTitle": "இன்னும் உருப்படிகள் இல்லை",
        "admin.libraryEmptyBody": "மேலே தலைப்பு மற்றும் கோப்பு URL சேர்க்கவும்.",
        "admin.libraryNeedTitle": "தலைப்பை உள்ளிடவும்.",
        "admin.libraryNeedUrl": "பாதுகாப்பான கோப்பு URL (https://…) உள்ளிடவும்.",
        "admin.libraryNeedCoverUrl": "முகப்பு படம் https:// அல்லது காலியாக விடவும்.",
        "admin.librarySaved": "நூலக உருப்படி சேர்க்கப்பட்டது.",
        "admin.libraryDeleted": "நீக்கப்பட்டது.",
        "admin.libraryUpdated": "புதுப்பிக்கப்பட்டது.",
        "admin.libraryDeleteConfirm": "இந்த உருப்படியை நூலகத்திலிருந்து நீக்கவா?",
        "admin.libraryEditPromptTitle": "தலைப்பு (EN)",
        "admin.libraryEditPromptTitleTa": "தலைப்பு (தமிழ், விருப்பம்)",
        "admin.libraryEditPromptAuthor": "ஆசிரியர் (விருப்பம்)",
        "admin.libraryEditPromptAuthorTa": "ஆசிரியர் தமிழ் (விருப்பம்)",
        "admin.libraryEditPromptUrl": "கோப்பு URL (https)",
        "admin.libraryEditPromptCover": "முகப்பு பட URL (https, விருப்பம்)",
        "admin.libraryEditPromptFormat": "வடிவம் (விருப்பம், எ.கா. pdf)",
        "admin.libraryEditPromptCategory": "வகை (விருப்பம்)",
        "admin.libraryEditPromptCategoryTa": "வகை தமிழ் (விருப்பம்)",
        "admin.libraryEditPromptDesc": "விளக்கம் (விருப்பம்)",
        "admin.libraryEditPromptDescTa": "விளக்கம் தமிழ் (விருப்பம்)",
        "home.announcementsTitle": "அறிவிப்புகள்",
        "home.announcementsSubtitle": "இந்த வாரத்தின் சமீபத்திய புதுப்பிப்புகள்.",
        "home.loadingAnnouncementsTitle": "அறிவிப்புகள் ஏற்றப்படுகின்றன...",
        "home.loadingAnnouncementsBody": "புதுப்பிப்புகள் ஏற்றும் வரை காத்திருக்கவும்.",
        "home.noAnnouncementsTitle": "இப்போது அறிவிப்புகள் இல்லை",
        "home.noAnnouncementsBody": "புதிய தகவல்களுக்கு பின்னர் பார்க்கவும்.",
        "home.loadAnnouncementsErrorTitle": "அறிவிப்புகளை ஏற்ற முடியவில்லை",
        "home.loadAnnouncementsErrorBody": "சற்று நேரத்தில் மீண்டும் முயற்சிக்கவும்.",
        "home.announcementUrgent": "அவசரம்",
        "home.announcementImportant": "முக்கியம்",
        "home.announcementBannerImageAlt": "அறிவிப்பு படம்",
        "home.announcementPrev": "முந்தைய அறிவிப்பு",
        "home.announcementNext": "அடுத்த அறிவிப்பு",
        "home.announcementDot": "அறிவிப்பு",
        "home.announcementBannerAlt": "அறிவிப்பு பதாகை",
        "home.announcementImageAlt": "அறிவிப்பு படம்",
        "home.announcementImageOnlyTitle": "பட அறிவிப்பு",
        "home.readMore": "மேலும் பார்க்க",
        "home.openInBible": "வேதாகமத்தில் திற",
        "home.personalWishFriend": "நண்பரே",
        "home.personalBirthdayTitle": "பிறந்தநாள் வாழ்த்துக்கள்!",
        "home.personalBirthdayBody": "உங்கள் சிறப்பு நாளில் அன்புடன் வாழ்த்துகிறோம், {name}. தேவன் உங்களை ஆசீர்வதிப்பார்!",
        "home.personalFamilyBirthdayTitle": "பிறந்தநாள் நினைவூட்டல்",
        "home.personalFamilyBirthdayBody": "இன்று {name} அவர்களின் பிறந்தநாள் - அவர்களுக்கு வாழ்த்துச் சொல்ல ஒரு நிமிடம் ஒதுக்குங்கள்!",
        "home.personalCelebrationsTitle": "இன்றைய விழாக்கள்",
        "home.personalCelebrationsLineBirthday": "பிறந்தநாள் வாழ்த்துக்கள், {name}! தேவன் உங்களை ஆசீர்வதிப்பார்.",
        "home.personalCelebrationsLineAnniversary": "திருமண நாள் வாழ்த்துக்கள், {name}! உங்கள் திருமணத்தை தேவன் ஆசீர்வதிப்பார்.",
        "home.personalCelebrationsLineFamily": "இன்று {name} அவர்களின் பிறந்தநாள் — வாழ்த்துச் சொல்லுங்கள்!",
        "home.personalWishCta": "வாழ்த்து சொல்",
        "home.personalWishScrollToThread": "வாழ்த்துப் பெட்டியைத் திற",
        "home.personalWishGoToCelebrationsPage": "விழாக்கள் பக்கத்தில் வாழ்த்து சொல்லுங்கள்",
        "celebrations.eyebrow": "விழாக்கள்",
        "celebrations.title": "இன்றைய விழாக்கள்",
        "celebrations.kindBirthdayOther": "பிறந்தநாள்",
        "celebrations.loginRequired": "சுயவிவரத்திலிருந்து பிறந்தநாட்களைக் காண முதலில் உள்நுழையவும்.",
        "celebrations.guestIntro": "சமூக விழாக்களையும் வாழ்த்துப் பெட்டியையும் காண சபைக் கணக்கில் உள்நுழையவும்.",
        "celebrations.membersOnlyBody": "சமூக பிறந்தநாட்கள், திருமண நாள் மற்றும் வாழ்த்துப் பெட்டியைக் காண சபைக் கணக்கில் உள்நுழையவும்.",
        "celebrations.membersOnlyGuestTitle": "விழாக்கள் — பதிவுசெய்த உறுப்பினர்களுக்கு மட்டும்",
        "celebrations.membersOnlyGuestBody": "இந்தப் பக்கத்தில் பிறந்தநாட்கள், திருமண நாள் மற்றும் வாழ்த்துக்களைக் காணவும் அனுப்பவும் பதிவுசெய்த உறுப்பினர்கள் மட்டுமே. தயவுசெய்து கணக்கை உருவாக்கவும் அல்லது உள்நுழையவும், பின்னர் மீண்டும் இந்தப் பக்கத்திற்கு வாருங்கள்.",
        "celebrations.registerToContinue": "பதிவு செய்",
        "celebrations.loginToContinue": "உள்நுழை",
        "celebrations.upcomingMembersOnly": "பதிவு செய்யவும் அல்லது உள்நுழையவும், பின்னர் வரவிருக்கும் விழாக்களை இங்கே காணலாம்.",
        "celebrations.wishThreadMembersOnly": "சமூக வாழ்த்துக்களைக் காண உள்நுழையவும்.",
        "celebrations.wishThreadSignInToView": "சமூக வாழ்த்துக்களைக் காணவும் அனுப்பவும் உள்நுழையவும்.",
        "celebrations.upcomingSignIn": "சுயவிவரத்திலிருந்து வரவிருப்ப தேதிகளைக் காண உள்நுழையவும்.",
        "celebrations.upcomingEmptyCommunity": "இன்னும் வரவிருப்ப தேதிகள் இல்லை. சுயவிவரத்தில் சேர்த்து சேமிக்கவும்.",
        "celebrations.emptyTodayCommunity": "இன்று சமூக விழாக்கள் இல்லை. சுயவிவரத்தில் பிறந்தநாள்/திருமண நாளைச் சேர்த்து சேமிக்கவும்.",
        "celebrations.communityLoadError": "சமூக விழாப் பட்டியலை ஏற்ற முடியவில்லை.",
        "celebrations.emptyToday": "இன்று உங்கள் சுயவிவரத்தில் பிறந்தநாள்/திருமண நாள் இல்லை. மேலே உள்ள சமூக வாழ்த்துப் பெட்டியை இன்னும் பயன்படுத்தலாம்.",
        "celebrations.wishThreadTitle": "இன்றைய சமூக வாழ்த்துக்கள்",
        "celebrations.wishThreadMessagesTitle": "அனைவரின் வாழ்த்துக்கள்",
        "celebrations.wishThreadSent": "அனுப்பப்பட்டது!",
        "celebrations.wishThreadIntro": "இன்று பிறந்தநாள்/திருமண நாள் கொண்டாடுபவர்களுக்கு அன்புடன் எழுதுங்கள்.",
        "celebrations.wishThreadPlaceholder": "வாழ்த்துச் செய்தியை எழுதுங்கள்…",
        "celebrations.wishThreadSend": "அனுப்பு",
        "celebrations.wishThreadLogin": "வாழ்த்து இடுவதற்கு உள்நுழையவும்.",
        "celebrations.wishThreadEmpty": "இன்னும் வாழ்த்துக்கள் இல்லை — முதலில் நீங்கள்!",
        "celebrations.wishThreadUnavailable": "வாழ்த்துக்கள் இப்போது கிடைக்கவில்லை.",
        "celebrations.wishThreadLoadError": "வாழ்த்துக்களை ஏற்ற முடியவில்லை.",
        "celebrations.wishThreadTooLong": "செய்தி மிக நீளமாக உள்ளது.",
        "celebrations.wishThreadSendError": "அனுப்ப முடியவில்லை. மீண்டும் முயற்சிக்கவும்.",
        "celebrations.wishThreadSendDenied": "அனுப்ப முடியவில்லை — celebration வாழ்த்துக்களுக்கான Firestore விதிகள் வெளியிடப்பட்டதா என சரிபார்க்கவும்.",
        "celebrations.wishThreadIndexError": "அனுப்ப முடியவில்லை — Firestore குறியீடு உருவாக்கப்படுகிறது. ஒரு நிமிடம் கழித்து முயற்சிக்கவும்.",
        "celebrations.useInThread": "பெட்டியில் பயன்படுத்து",
        "celebrations.useInThreadHint": "கீழுள்ள பெட்டியை நிரப்பும் — திருத்தி அனுப்பவும்.",
        "celebrations.wishMessageBirthday": "பிறந்தநாள் வாழ்த்துக்கள், {name}! தேவன் உங்களை ஆசீர்வதிப்பார்.",
        "celebrations.wishMessageAnniversary": "திருமண நாள் வாழ்த்துக்கள், {name}! உங்கள் திருமணத்தை தேவன் ஆசீர்வதிப்பார்.",
        "celebrations.wishMessageFamily": "பிறந்தநாள் வாழ்த்துக்கள், {name}! அருமையான நாளாக அமையட்டும்.",
        "celebrations.wishMessageGeneric": "இன்று உங்களை நினைக்கிறோம் — தேவன் ஆசீர்வதிப்பார்!",
        "celebrations.kindMyBirthday": "உங்கள் பிறந்தநாள்",
        "celebrations.kindAnniversary": "உங்கள் திருமண நாள்",
        "celebrations.kindAnniversaryPublic": "திருமண நாள்",
        "celebrations.kindEvent": "விழா",
        "celebrations.copied": "செய்தி நகலெடுக்கப்பட்டது — உங்கள் செயலியில் ஒட்டவும்.",
        "celebrations.copyFallback": "இந்தச் செய்தியை நகலெடுக்கவும்:",
        "celebrations.celebratingTodayTitle": "இன்று கொண்டாடுபவர்கள்",
        "celebrations.tapCardHint": "பரிந்துரைக்கப்பட்ட வாழ்த்தை கீழுள்ள பெட்டியில் நிரப்ப ஒரு வரிசையைத் தட்டுங்கள்.",
        "celebrations.upcomingTitle": "வரவிருக்கும் விழாக்கள்",
        "celebrations.upcomingInDays": "{days} நாட்களில்",
        "celebrations.upcomingEmpty": "வரவிருப்பதைக் காண சுயவிவரத்தில் பிறந்தநாள்/திருமண நாளைச் சேர்க்கவும்.",
        "celebrations.wishButton": "வாழ்த்து",
        "celebrations.toggleThread": "வாழ்த்துக்களைக் காட்டு",
        "celebrations.deleteWish": "நீக்கு",
        "celebrations.deleteConfirm": "இந்தச் செய்தியை நீக்கவா?",
        "celebrations.clearThread": "அனைத்தையும் நீக்கு",
        "celebrations.clearConfirm": "இந்தப் பிரிவில் உள்ள அனைத்து செய்திகளையும் நீக்கவா?",
        "celebrations.clearFailed": "நீக்க முடியவில்லை.",
        "celebrations.deleteFailed": "நீக்க முடியவில்லை.",
        "celebrations.communityWishDefault": "இன்று கொண்டாடுபவர்களுக்கு அன்புடன் வாழ்த்துக்கள்!",
        "home.personalAnniversaryTitle": "திருமண நாள் வாழ்த்துக்கள்!",
        "home.personalAnniversaryBody": "இன்று உங்கள் திருமண நாளை கொண்டாடுகிறோம், {name}. உங்கள் திருமணத்தை தேவன் ஆசீர்வதிப்பார்!",
        "home.readingDatePrefix": "இன்று:",
        "home.readingProgressTitle": "வாசிப்பு முன்னேற்றம்",
        "home.readingProgressSummary": "{done}/{total} நாட்கள் முடிந்தது",
        "home.readingRemainingDays": "இன்னும் {count} நாட்கள் உள்ளது",
        "home.readingRemainingPercent": "இன்னும் {count}% முடிக்க வேண்டும்",
        "home.unreadDaysShow": "வாசிக்காத நாட்கள் ({count})",
        "home.unreadDaysHide": "வாசிக்காத பட்டியலை மறை",
        "home.markAllUnreadRead": "அனைத்தையும் வாசித்ததாகக் குறி",
        "home.unreadDaysEmpty": "இன்றுவரை தவறவிட்ட வாசிப்பு இல்லை.",
        "home.unreadDaysTitle": "முடிக்க வேண்டிய வாசிப்புகள்",
        "home.markMorningDone": "காலை வாசிப்பு முடிந்தது",
        "home.markEveningDone": "மாலை வாசிப்பு முடிந்தது",
        "home.morningShort": "காலை",
        "home.eveningShort": "மாலை",
        "home.readTooltipDone": "வாசிப்பு முடிந்தது",
        "home.readingStreak": "தொடர் நாட்கள்: {count}",
        "home.morningReading": "காலை வாசிப்பு",
        "home.eveningReading": "மாலை வாசிப்பு",
        "home.loadingReadingTitle": "இன்றைய வாசிப்பு திட்டம் ஏற்றப்படுகிறது...",
        "home.loadingReadingBody": "இன்றைய அட்டவணையை ஏற்றும் வரை காத்திருக்கவும்.",
        "home.noReadingTitle": "இன்று வாசிப்பு பதிவு இல்லை",
        "home.noReadingBody": "உங்கள் Readingplan செயலியை பார்க்கவும்.",
        "home.loadReadingErrorTitle": "இன்றைய வாசிப்பு திட்டத்தை ஏற்ற முடியவில்லை",
        "home.loadReadingErrorBody": "சற்று நேரத்தில் மீண்டும் முயற்சிக்கவும்.",
        "home.thisWeekTitle": "இந்த வார நிகழ்வுகள்",
        "home.loadingWeekTitle": "நிகழ்வுகள் ஏற்றப்படுகின்றன...",
        "home.loadingWeekBody": "அடுத்த தேதிகளை கணக்கிட காத்திருக்கவும்.",
        "home.noEventsTitle": "இப்போது நிகழ்வுகள் இல்லை",
        "home.noEventsBody": "புதுப்பிப்புகளுக்கு நிகழ்வுகள் தாவலை பார்க்கவும்.",
        "home.triviaTitle": "இன்றைய வேதாகமக் கேள்விகள்",
        "home.triviaSubtitle": "தமிழ் வேதாகமக் கேள்விகள். பெல்ஜியம் நேரத்தில் நள்ளிரவு முதல் புதிய கேள்வி.",
        "home.triviaLoading": "வேதாகமக் கேள்விகள் ஏற்றப்படுகிறது...",
        "home.triviaEmpty": "இன்று வேதாகமக் கேள்விகள் இல்லை. நாளை பெல்ஜியம் நேரத்தில் நள்ளிரவு முதல் பார்க்கவும்.",
        "home.triviaEmptyWeekend": "வேதாகமக் கேள்விகள் திங்கள் முதல் வெள்ளி பெல்ஜியம் நேர நள்ளிரவு முதல் கிடைக்கும்.",
        "home.triviaError": "வேதாகமக் கேள்விகளை ஏற்ற முடியவில்லை. பின்னர் முயற்சிக்கவும்.",
        "home.triviaCorrect": "சரி! நல்லது.",
        "home.triviaWrong": "சரியல்ல. நாளை மீண்டும் முயற்சிக்கவும்.",
        "home.triviaParticipated": "இன்று ஏற்கனவே பங்கேற்றீர்கள். நாளை வாருங்கள்!",
        "home.triviaShowOptions": "விருப்பங்களை காட்டு",
        "home.triviaWrongTitle": "தவறு!",
        "home.triviaWrongMessage": "சரியான விடை:",
        "home.triviaWrongClose": "சரி",
        "home.triviaPoints": "புள்ளிகள்",
        "home.triviaScore": "உங்கள் மதிப்பெண்: {count}",
        "home.triviaStatPoints": "புள்ளிகள்",
        "home.triviaStatCorrect": "சரி",
        "home.triviaStatWrong": "தவறு",
        "home.triviaStatStreak": "தொடர்",
        "home.triviaShare": "முடிவை பகிர்",
        "home.triviaShareText": "இன்றைய வேதாகமக் கேள்விகளில் சரியாக பதிலளித்தேன்! +1 புள்ளி",
        "home.triviaShareCopied": "நகலெடுக்கப்பட்டது",
        "home.triviaWeeklySummary": "இந்த வாரம்: {correct} சரி, {wrong} தவறு",
        "home.triviaNoQuestion": "கேள்வி இல்லை",
        "home.loadEventsErrorTitle": "இந்த வார நிகழ்வுகளை ஏற்ற முடியவில்லை",
        "home.loadEventsErrorBody": "புதுப்பிக்க நிகழ்வுகள் தாவலைத் திறக்கவும்.",
        "actions.events": "நிகழ்வுகள்",
        "actions.sermons": "பிரசங்கம்",
        "actions.contact": "தொடர்பு",
        "actions.calendar": "காலண்டர்",
        "actions.messages": "செய்திகள்",
        "actions.joinUs": "எங்களுடன் சேருங்கள்",
        "actions.dashboard": "முகப்பு",
        "actions.rsvp": "பங்கேற்பு பதிவு",
        "actions.live": "நேரலை",
        "actions.audio": "ஒலிக்கோவை",
        "actions.notes": "குறிப்புகள்",
        "actions.email": "மின்னஞ்சல்",
        "actions.call": "அழைப்பு",
        "actions.visit": "வருகை",
        "about.eyebrow": "பற்றி",
        "about.title": "நாங்கள் யார்",
        "about.subtitle": "கிறிஸ்துவில் ஒன்றாக வளரும் விசுவாசக் குடும்பம்.",
        "about.missionTitle": "எங்கள் பணிக்கூற்று",
        "about.missionBody": "நம்பிக்கையை பகிர, சீடர்களை உருவாக்க, பெல்ஜியத்தில் குடும்பங்களை அன்புடன் சேவிக்க நாங்கள் இருக்கிறோம்.",
        "about.valuesTitle": "முக்கிய மதிப்புகள்",
        "about.valueWorship": "ஆராதனை",
        "about.valueWorshipBody": "மனமார்ந்த ஸ்தோத்திரமும் ஜெபத்தாலும் தேவனை கௌரவிக்கிறோம்.",
        "about.valueCommunity": "சமூகம்",
        "about.valueCommunityBody": "எந்த காலத்திலும் ஒருவருக்கொருவர் துணையாக இருக்கிறோம்.",
        "about.valueService": "சேவை",
        "about.valueServiceBody": "சபை உள்ளும் வெளியும் இரக்கத்துடன் சேவை செய்கிறோம்.",
        "about.leadershipTitle": "தலைமை",
        "about.leadershipBody": "எங்கள் மேய்ப்பர்களும் குழுத் தலைவர்களும் வாரம் முழுவதும் ஜெபம், பராமரிப்பு, வழிகாட்டலுக்கு தயாராக உள்ளனர்.",
        "prayer.eyebrow": "ஜெபம்",
        "prayer.title": "ஜெப சுவர்",
        "prayer.subtitle": "சபை குடும்பமாக ஒன்றிணைந்து ஜெபிக்க வேண்டுதல்களை பகிருங்கள்.",
        "events.eyebrow": "நிகழ்வுகள்",
        "events.title": "நிகழ்வுகள்",
        "events.subtitle": "ஆராதனை, ஜெப இரவுகள், சகோதரத்துவ தருணங்களுடன் இணைந்திருங்கள்.",
        "events.upcomingTitle": "வரவிருக்கும் நிகழ்வுகள்",
        "events.loadingUpcomingTitle": "வரவிருக்கும் நிகழ்வுகள் ஏற்றப்படுகின்றன...",
        "events.loadingUpcomingBody": "அடுத்த தேதிகளை கணக்கிட காத்திருக்கவும்.",
        "events.seeMore": "மேலும் நிகழ்வுகள் காண்க",
        "events.scheduleRules": "அட்டவணை விதிகள்",
        "events.holyServiceTitle": "பரிசுத்த ஆராதனையும் திருவிருந்தும்",
        "events.holyServiceTime": "ஒவ்வொரு ஞாயிறும் 14:30 (பெல்ஜியம் நேரம்)",
        "events.specialPrayerTitle": "விசேட ஜெபக்கூடுகை",
        "events.specialPrayerTime": "2வது மற்றும் 4வது சனிக்கிழமை 17:00 (பெல்ஜியம் நேரம்)",
        "events.upcomingSpecialTitle": "வரவிருக்கும் சிறப்பு நிகழ்வுகள்",
        "events.loadingSpecialTitle": "சிறப்பு நிகழ்வுகள் ஏற்றப்படுகின்றன...",
        "events.loadingSpecialBody": "வரவிருக்கும் சிறப்பு நிகழ்வுகளை ஏற்ற காத்திருக்கவும்.",
        "events.noUpcomingTitle": "வரவிருக்கும் நிகழ்வுகள் இல்லை",
        "events.noUpcomingBody": "புதிய தேதிகளுக்காக பின்னர் பார்க்கவும்.",
        "events.noSpecialTitle": "வரவிருக்கும் சிறப்பு நிகழ்வுகள் இல்லை",
        "events.noSpecialBody": "தேதிகள் அறிவிக்கப்பட்டவுடன் இங்கே காட்டப்படும்.",
        "events.loadUpcomingErrorTitle": "வரவிருக்கும் நிகழ்வுகளை கணக்கிட முடியவில்லை",
        "events.loadUpcomingErrorBody": "புதுப்பித்து மீண்டும் முயற்சிக்கவும்.",
        "events.loadSpecialErrorTitle": "சிறப்பு நிகழ்வுகளை ஏற்ற முடியவில்லை",
        "events.loadSpecialErrorBody": "புதுப்பித்து மீண்டும் முயற்சிக்கவும்.",
        "events.specialPrev": "முந்தைய சிறப்பு நிகழ்வு",
        "events.specialNext": "அடுத்த சிறப்பு நிகழ்வு",
        "events.specialDot": "சிறப்பு நிகழ்வு",
        "events.addToCalendar": "காலண்டரில் சேர்",
        "events.event": "நிகழ்வு",
        "events.specialEvent": "சிறப்பு நிகழ்வு",
        "events.typeRecurring": "மறுமொழி",
        "events.typeSpecial": "சிறப்பு",
        "bible.eyebrow": "வேதாகமம்",
        "bible.title": "வேதாகம வாசிப்பு",
        "bible.info": "ஆங்கிலம், தமிழ், டச், உரோம எழுத்து தமிழ் (சபை வாசிப்புத் திட்டப் பிரதிகள்) — வாசிக்கவும்.",
        "bible.languageLabel": "மொழி",
        "bible.languageEnglish": "ஆங்கிலம்",
        "bible.languageTamil": "தமிழ்",
        "bible.languageDutch": "டச் (ஹால்லான்ட்)",
        "bible.languageTamilRomanized": "தமிழ் (உரோம)",
        "bible.book": "புத்தகம்",
        "bible.chapter": "அதிகாரம்",
        "bible.verse": "வசனம்",
        "bible.go": "செல்",
        "bible.prev": "முந்தைய அதிகாரம்",
        "bible.next": "அடுத்த அதிகாரம்",
        "bible.fullscreenOpen": "முழுத்திரை வாசிப்பு",
        "bible.fullscreenExit": "செயலிக்கு திரும்பு",
        "bible.ttsPlay": "ஒலி வேதாகமம் தொடங்கு",
        "bible.ttsPause": "ஒலி வேதாகமத்தை இடைநிறுத்து",
        "bible.ttsResume": "ஒலி வேதாகமத்தை தொடரு",
        "bible.ttsStop": "ஒலி வேதாகமத்தை நிறுத்து",
        "bible.ttsUnsupported": "இந்த உலாவியில் ஒலி வேதாகமம் ஆதரவு இல்லை.",
        "bible.ttsNoAudio": "ஒலி தொடங்கவில்லை. ஒலியளவு மற்றும் பேச்சு அமைப்புகளை சரிபார்க்கவும்.",
        "bible.ttsBlockedOrMuted": "ஒலி இயங்கவில்லை (நெட்வொர்க் அல்லது உலாவி தடுக்கலாம்). மீண்டும் முயற்சிக்கவும் அல்லது ஆங்கிலம் / வேறு உலாவியை பயன்படுத்தவும்.",
        "bible.loading": "வேதாகமம் ஏற்றப்படுகிறது...",
        "bible.error": "வேதாகமத்தை இப்போது ஏற்ற முடியவில்லை.",
        "bible.noData": "இந்த அதிகாரத்திற்கு வசனங்கள் இல்லை.",
        "bible.reference": "{book} {chapter}",
        "bible.shareImage": "வசன படத்தை பகிர்",
        "bible.shareGenerating": "வசன படத்தை உருவாக்குகிறது...",
        "bible.shareNoVerse": "முதலில் ஒரு வசனத்தை தேர்ந்தெடுக்கவும்.",
        "bible.shareReady": "வசன படம் பகிரத் தயாராக உள்ளது.",
        "bible.shareDownloaded": "வசன படம் பதிவிறங்கியது. WhatsApp/Instagram-இல் பகிருங்கள்.",
        "bible.shareCancelled": "பகிர்வு ரத்து செய்யப்பட்டது.",
        "bible.shareError": "இப்போது பகிர்வு படத்தை உருவாக்க முடியவில்லை.",
        "bible.searchLabel": "அனைத்து வேதாகமங்களிலும் தேடு",
        "bible.searchPlaceholder": "அனைத்து வேதப் பிரதிகளிலும் தேடு…",
        "bible.searchButton": "தேடு",
        "bible.searchAllLanguagesHint": "ஆங்கிலம், தமிழ், டச், உரோம தமிழ் — ஒரே நேரத்தில் தேடல்.",
        "bible.searchTooShort": "தேட குறைந்தது 2 எழுத்துக்கள் தட்டச்சு செய்யவும்.",
        "bible.searchNoResults": "எந்த வேதப் பிரதியிலும் பொருந்துவது இல்லை.",
        "bible.searchMoreAvailable": "(ஒவ்வொரு மொழிக்கும் முதல் பொருத்தங்கள் மட்டும்.)",
        "bible.searchResultCount": "பொருத்தம்(ங்கள்)",
        "bible.searchRunning": "அனைத்து மொழிகளிலும் தேடுகிறது…",
        "bible.searchToggleAria": "வேதாகமத்தை தேடு",
        "bible.searchToggleTitle": "வேதாகமத்தை தேடு",
        "bible.searchToggleCloseTitle": "வேதாகமத் தேடலை மூடு",
        "sermons.eyebrow": "பிரசங்கம்",
        "sermons.title": "சமீபத்திய செய்திகள்",
        "sermons.subtitle": "மீண்டும் கேளுங்கள், குறிப்பெடுங்கள், வாரம் முழுவதும் வளருங்கள்.",
        "sermons.latestTitle": "சமீபத்திய பிரசங்கங்கள்",
        "sermons.loadingTitle": "பிரசங்கங்கள் ஏற்றப்படுகின்றன...",
        "sermons.loadingBody": "சமீபத்திய செய்திகளை ஏற்ற காத்திருக்கவும்.",
        "sermons.seeMore": "மேலும் பிரசங்கங்கள் காண்க",
        "sermons.archiveTitle": "காப்பகம்",
        "sermons.archiveLoading": "காப்பக சுருக்கம் ஏற்றப்படுகிறது...",
        "sermons.tip": "குறிப்பு: சமீபத்திய பட்டியலில் இருந்து செயலிக்குள் நேரடியாக ஆடியோ திறக்கலாம்.",
        "sermons.nowPlaying": "இப்போது ஒலிக்கிறது",
        "sermons.noSermonsTitle": "இன்னும் பிரசங்கங்கள் இல்லை",
        "sermons.noSermonsBody": "தயவுசெய்து பின்னர் மீண்டும் பார்க்கவும்.",
        "sermons.archiveEmpty": "பிரசங்க காப்பகம் இன்னும் இல்லை.",
        "sermons.archiveTotal": "மொத்தம் கிடைக்கும் பிரசங்கங்கள்: {count}.",
        "sermons.speakerPrefix": "பேச்சாளர்",
        "sermons.tapToPlayInApp": "செயலியில் கேட்க தட்டவும்",
        "sermons.audioNotAvailable": "ஆடியோ கிடைக்கவில்லை",
        "sermons.dateUnavailable": "தேதி கிடைக்கவில்லை",
        "sermons.loadErrorTitle": "பிரசங்கங்களை ஏற்ற முடியவில்லை",
        "sermons.loadErrorBody": "புதுப்பித்து மீண்டும் முயற்சிக்கவும்.",
        "sermons.archiveUnavailable": "பிரசங்க காப்பகம் தற்காலிகமாக கிடைக்கவில்லை.",
        "sermons.searchPlaceholder": "தலைப்பு, பேச்சாளர், தேதியால் பிரசங்கம் தேடுக",
        "sermons.searchButton": "தேடு",
        "sermons.searchNoResultsTitle": "பொருந்தும் பிரசங்கம் இல்லை",
        "sermons.searchNoResultsBody": "மற்றொரு சொல் வைத்து தேடிப் பார்க்கவும்.",
        "sermons.searchMatches": "{count} முடிவுகள் கிடைத்தன.",
        "sermons.filterToggle": "வடிகட்டிகளை திற / மூடு",
        "sermons.filterSaved": "சேமித்தவை",
        "sermons.savedOnly": "சேமித்தவை மட்டும்",
        "sermons.speed": "வேகம்",
        "sermons.sleepTimer": "நிறுத்தும் நேரம்",
        "sermons.sleepOff": "நிறுத்த வேண்டாம்",
        "sermons.sleep15": "15 நிமிடம்",
        "sermons.sleep30": "30 நிமிடம்",
        "sermons.sleep45": "45 நிமிடம்",
        "sermons.sleepActive": "{count} நிமிடத்தில் நிறுத்தப்படும்",
        "sermons.playInApp": "செயலியில் கேளுங்கள்",
        "sermons.favoriteAdd": "பிடித்ததில் சேர்",
        "sermons.favoriteRemove": "பிடித்ததில் இருந்து நீக்கு",
        "songbook.eyebrow": "பாடல்கள்",
        "songbook.title": "NJC பாடல் தொகுப்பு",
        "trivia.eyebrow": "வேதாகமக் கேள்விகள்",
        "trivia.title": "இன்றைய வேதாகமக் கேள்விகள்",
        "songbook.subtitle": "NJC Songbook GitHub-இல் இருந்து பாடல்கள்.",
        "songbook.searchPlaceholder": "தலைப்பு, எழுத்தாளர், பாடல்வரியால் தேடுக",
        "songbook.loadingTitle": "பாடல்கள் ஏற்றப்படுகின்றன...",
        "songbook.loadingBody": "பாடல் தொகுப்பு ஏற்றும் வரை காத்திருக்கவும்.",
        "songbook.emptyTitle": "பாடல்கள் இல்லை",
        "songbook.emptyBody": "பின்னர் மீண்டும் முயற்சிக்கவும்.",
        "songbook.tabSongs": "பாடல்கள்",
        "songbook.tabService": "சேவை",
        "songbook.tabFavorite": "பிடித்தவை",
        "songbook.scriptLabel": "எழுத்து",
        "songbook.scriptTamil": "தமிழ்",
        "songbook.scriptRomanized": "ரோமனைஸ்",
        "songbook.addService": "சேவை பட்டியலில் சேர்",
        "songbook.removeService": "சேவை பட்டியலில் இருந்து நீக்கு",
        "songbook.addFavorite": "பிடித்ததில் சேர்",
        "songbook.removeFavorite": "பிடித்ததில் இருந்து நீக்கு",
        "songbook.serviceLoadingTitle": "சேவை பாடல்கள் ஏற்றப்படுகிறது...",
        "songbook.serviceLoadingBody": "இந்த வார சேவை பட்டியலை ஏற்ற காத்திருக்கவும்.",
        "songbook.serviceEmptyTitle": "சேவை பாடல்கள் இல்லை",
        "songbook.serviceEmptyBody": "வரவிருக்கும் சேவைக்கான பாடல்களை நிர்வாகி சேர்ப்பார்.",
        "songbook.favoriteEmptyTitle": "பிடித்த பாடல்கள் இல்லை",
        "songbook.favoriteEmptyBody": "எந்த பாடலிலும் நட்சத்திரத்தை அழுத்தி பிடித்ததில் சேமிக்கவும்.",
        "songbook.unknownSong": "தெரியாத பாடல்",
        "songbook.loadErrorTitle": "பாடல் தொகுப்பை ஏற்ற முடியவில்லை",
        "songbook.loadErrorBody": "இணைப்பைச் சரிபார்த்து மீண்டும் முயற்சிக்கவும்.",
        "songbook.authorPrefix": "எழுத்தாளர்",
        "songbook.openLyrics": "பாடல்வரிகள் திற",
        "songbook.closeLyrics": "பாடல்வரிகள் மூடு",
        "songbook.noLyrics": "பாடல்வரிகள் இல்லை",
        "songbook.closeView": "மூடி பட்டியலுக்கு திரும்பு",
        "notify.title": "அறிவிப்புகள்",
        "notify.quickOpen": "அறிவிப்பு அமைப்புகள்",
        "notify.subtitle": "சேவை நினைவூட்டல், புதிய பிரசங்கம், ஜெப வேண்டுதல் மற்றும் செய்திகள் பற்றிய அறிவிப்புகளைப் பெறுங்கள்.",
        "notify.statusOn": "அறிவிப்புகள் செயல்பாட்டில் உள்ளன.",
        "notify.statusOff": "அறிவிப்புகள் தற்போது அணைக்கப்பட்டுள்ளன.",
        "notify.statusBlocked": "Browser-ல் அறிவிப்புகள் தடுக்கப்பட்டுள்ளன. Settings-ல் அனுமதி அளிக்கவும்.",
        "notify.statusUnsupported": "இந்த சாதனத்தில் அறிவிப்புகள் ஆதரிக்கப்படவில்லை.",
        "notify.enable": "அறிவிப்புகளை இயக்கு",
        "notify.disable": "அறிவிப்புகளை அணை",
        "notify.reminderLabel": "நினைவூட்டல் நேரம்",
        "notify.reminder15": "15 நிமிடம் முன்",
        "notify.reminder30": "30 நிமிடம் முன்",
        "notify.reminder60": "60 நிமிடம் முன்",
        "notify.triviaReminderTitle": "வேதாகமக் கேள்விகள்",
        "notify.triviaReminderBody": "இன்றைய தமிழ் வேதாகமக் கேள்விகள் தயார்! விளையாட கிளிக் செய்யவும்.",
        "notify.eventSoonTitle": "நிகழ்வு நினைவூட்டல்",
        "notify.newSermonTitle": "புதிய பிரசங்கம் கிடைக்கிறது",
        "notify.newPrayerTitle": "புதிய ஜெப வேண்டுதல் வந்துள்ளது",
        "notify.newMailboxTitle": "புதிய செய்தி வந்துள்ளது",
        "notify.newNoticeTitle": "புதிய அறிவிப்பு வந்துள்ளது",
        "notify.newBroadcastTitle": "புதிய ஒலிபரப்பு செய்தி வந்துள்ளது",
        "notify.menuInbox": "அறிவிப்புகள்",
        "notify.unread": "படிக்காதவை",
        "notify.noneTitle": "புதிய அறிவிப்புகள் இல்லை",
        "notify.noneBody": "புதிய செய்திகள் வந்தால் இங்கே தெரியும்.",
        "notify.markAllRead": "அனைத்தையும் படித்ததாக குறி",
        "notify.clearRead": "படித்தவற்றை நீக்கு",
        "sermons.filterSpeaker": "பேச்சாளர்",
        "sermons.filterMonth": "மாதம்",
        "sermons.filterAll": "அனைத்தும்",
        "offline.active": "ஆஃப்லைன் முறை செயல்பாட்டில் உள்ளது",
        "player.openSermonsPage": "பிரசங்கங்கள் பக்கத்தைத் திற",
        "player.openBiblePage": "வேதாகம பக்கத்தைத் திற",
        "player.playOrPause": "ஒலிக்க அல்லது நிறுத்த",
        "player.stopAndClose": "நிறுத்தி மூட",
        "player.close": "ப்ளேயரை மூடு",
        "player.minimize": "ப்ளேயரை சிறிதாக்கு",
        "player.seekPosition": "இடத்தை மாற்று",
        "player.previousSermon": "முந்தைய பிரசங்கம்",
        "player.nextSermon": "அடுத்த பிரசங்கம்",
        "player.controls": "ப்ளேயர் கட்டுப்பாடுகள்",
        "contact.eyebrow": "தொடர்பு",
        "contact.title": "எங்கள் குழுவை அணுகுங்கள்",
        "contact.subtitle": "கேள்விகள், ஜெப வேண்டுதல்கள், அல்லது உதவி தேவைகள் - நாங்கள் உங்களுக்காக உள்ளோம்.",
        "contact.getInTouch": "தொடர்பு கொள்ள",
        "contact.emailLabel": "மின்னஞ்சல்:",
        "contact.phoneLabel": "தொலைபேசி:",
        "contact.officeHours": "அலுவலக நேரம்",
        "contact.weekdays": "வார நாட்கள்",
        "contact.weekendSupport": "வார இறுதி உதவி",
        "contact.weekendSupportTime": "ஞாயிறு ஆராதனைக்கு முன் மற்றும் பின்",
        "contact.location": "இடம்",
        "contact.locationName": "புதிய எருசலேம் சபை பெல்ஜியம்",
        "contact.transitByBus": "பஸ் மூலம்:",
        "contact.transitStopBus": "(நிறுத்தம் Deurne Van Deynsestraat)",
        "contact.transitByTram": "டிராம் மூலம்:",
        "contact.transitStopTram": "(நிறுத்தம் Ten Eekhove)",
        "contact.transitStopSport": "(நிறுத்தம் Sport)",
        "contact.prayerTitle": "எங்களுடன் பகிருங்கள் / தொடர்பு கொள்ளுங்கள்",
        "contact.prayerSubtitle": "உங்கள் செய்தியை எங்களுடன் பகிருங்கள். உங்களிடமிருந்து கேட்க நாங்கள் மகிழ்கிறோம்.",
        "contact.prayerNamePlaceholder": "உங்கள் பெயர் (விரும்பினால்)",
        "contact.prayerMessagePlaceholder": "உங்கள் செய்தியை எழுதுங்கள்",
        "contact.sendPrayer": "செய்தியை அனுப்பு",
        "contact.prayerNeedMessage": "தயவுசெய்து உங்கள் செய்தியை எழுதுங்கள்.",
        "contact.prayerMailOpened": "உங்கள் மின்னஞ்சல் செயலி திறக்கப்பட்டது.",
        "contact.messageSent": "உங்கள் செய்தி செயலிக்குள் அனுப்பப்பட்டது.",
        "contact.messageSendError": "செய்தியை இப்போது அனுப்ப முடியவில்லை. மீண்டும் முயற்சிக்கவும்.",
        "contact.openMap": "Google Maps-ல் திற",
        "contact.prayerWallTitle": "ஜெப சுவர்",
        "contact.prayerShareLink": "இணைப்பு பகிர்",
        "contact.prayerShareAria": "இந்த ஜெபத்திற்கான இணைப்பைப் பகிர்",
        "contact.prayerLinkCopied": "இணைப்பு நகல் எடுக்கப்பட்டது. அச்சப்பட்டியலில் ஒட்டவும் (chat அல்லது மின்னஞ்சல்).",
        "contact.prayerShareFailed": "நகல் எடுக்க முடியவில்லை. மீண்டும் முயலவும், அல்லது முகவி பட்டியில் URL ஐப் பகிர்ந்து நகல் எடுக்கவும்.",
        "contact.prayerShareNameFallback": "ஜெப வேண்டுதல்",
        "contact.prayerWallSubtitle": "சபை குடும்பம் ஜெபிக்க உங்கள் வேண்டுதலை பகிருங்கள். புதிய பதிவுகள் சுவரில் தோன்ற நிர்வாகி அங்கீகாரம் தேவை.",
        "contact.prayerWallOpen": "ஜெப வேண்டுதல் பதிவிடு",
        "contact.prayerWallCancel": "மூடு",
        "contact.prayerWallNamePlaceholder": "பெயர் (விருப்பம்)",
        "contact.prayerWallMessagePlaceholder": "ஜெப வேண்டுதல் எழுதுங்கள்",
        "contact.prayerWallAnonymousLabel": "அடையாளமில்லாமல் பகிர்",
        "contact.prayerWallUrgentLabel": "அவசர வேண்டுதல்",
        "contact.prayerWallPastorOnlyLabel": "ஊழியருக்கு மட்டும் (ஊழியருக்கு மட்டும் தெரியும்)",
        "contact.prayerWallPastorOnlyBadge": "ஊழியருக்கு மட்டும்",
        "contact.prayerWallUrgentBadge": "அவசரம்",
        "contact.prayerWallUrgentRibbon": "அவசர ஜெபம்",
        "contact.prayerWallTabUrgent": "அவசரம்",
        "contact.prayerWallTabOther": "தினசரி ஜெபம்",
        "contact.prayerWallTabAnswered": "பதிலளிக்கப்பட்டது",
        "contact.prayerWallNoAnsweredTitle": "பதிலளிக்கப்பட்ட ஜெபங்கள் இல்லை",
        "contact.prayerWallNoAnsweredBody": "“பதிலளித்தேன்” எண்ணிக்கை 0-ஐ விட அதிகமான கோரிக்கைகள் இங்கே தோன்றும்.",
        "contact.prayerWallTabMine": "என் ஜெபம்",
        "contact.prayerWallNoMineTitle": "பட்டியல் காலியாக உள்ளது",
        "contact.prayerWallNoMineBody": "எந்த ஜெபத்தையும் திறந்து “என் ஜெபத்தில் சேர்” என்பதைத் தட்டவும், அல்லது கீழே உள்ள பொத்தானைப் பயன்படுத்தவும்.",
        "contact.prayerMineToolbarHint": "வேண்டுதலைத் திறந்து “என் ஜெபத்தில் சேர்” அல்லது அட்டையில் உள்ள பொத்தானைப் பயன்படுத்தவும். பின்னர் அச்சிடவும் அல்லது PDF-ஆகச் சேமிக்கவும்.",
        "contact.prayerMineExportPdf": "PDF",
        "contact.prayerMineClearAll": "பட்டியலை அழி",
        "contact.prayerMineAdd": "என் ஜெபத்தில் சேர்",
        "contact.prayerMineRemove": "என் ஜெபத்திலிருந்து நீக்கு",
        "contact.prayerMineRemoveShort": "நீக்கு",
        "contact.prayerMineAddShort": "என் ஜெபம்",
        "contact.prayerMineRemoveFromList": "என் ஜெபத்திலிருந்து நீக்கு",
        "contact.prayerMineAdded": "உங்கள் பட்டியலில் சேர்க்கப்பட்டது. “என் ஜெபம்” தாவலைத் திறந்து PDF உருவாக்கலாம்.",
        "contact.prayerMineRemoved": "பட்டியலிலிருந்து நீக்கப்பட்டது.",
        "contact.prayerMineFull": "பட்டியல் நிரம்பியுள்ளது. முதலில் சிலவற்றை நீக்கவும்.",
        "contact.prayerMineClearConfirm": "உங்கள் தனிப்பட்ட பட்டியலிலிருந்து அனைத்து ஜெபங்களையும் நீக்கவா?",
        "contact.prayerMineCleared": "பட்டியல் காலியாக்கப்பட்டது.",
        "contact.prayerMinePdfTitle": "என் ஜெபப் பட்டியல் — NJC Belgium",
        "contact.prayerMinePdfGenerated": "உருவாக்கப்பட்டது",
        "contact.prayerMinePdfSubtitle": "சபை ஜெபச் சுவரிலிருந்து தனிப்பட்ட பட்டியல். பகிரும்போது கவனமாக இருங்கள்; கோரிக்கைகள் ரகசியமாக இருக்கட்டும்.",
        "contact.prayerMinePdfCount": "இந்தப் பட்டியலில் ஜெபங்கள்: {count}",
        "contact.prayerMinePdfPosted": "பதிவிடப்பட்டது",
        "contact.prayerMinePdfFooter": "என் ஜெபப் பட்டியல் · தனிப்பட்ட ஜெபத்திற்கு · ரகசியமாக வைக்கவும்.",
        "contact.prayerMinePdfEmpty": "முதலில் பட்டியலில் ஜெபங்களைச் சேர்த்த பின் முயற்சிக்கவும்.",
        "contact.prayerMinePdfBlocked": "இந்த தளத்திற்கு பாப்-அப்களை அனுமதிக்கவும், அல்லது உலாவியின் அச்சு மெனுவைப் பயன்படுத்தவும்.",
        "contact.prayerWallPost": "ஜெப சுவரில் பகிர்",
        "contact.prayerWallLoadingTitle": "ஜெப சுவர் ஏற்றப்படுகிறது...",
        "contact.prayerWallLoadingBody": "தயவுசெய்து காத்திருக்கவும்.",
        "contact.prayerWallNoEntriesTitle": "இன்னும் ஜெப வேண்டுதல்கள் இல்லை",
        "contact.prayerWallNoEntriesBody": "முதல் வேண்டுதலை நீங்கள் பகிரலாம்.",
        "contact.prayerWallNoUrgentTitle": "இப்போது அவசர ஜெபங்கள் இல்லை",
        "contact.prayerWallNoUrgentBody": "அவசர வேண்டுதல்கள் இங்கு முதலில் காட்டப்படும்.",
        "contact.prayerWallNoOtherTitle": "தினசரி ஜெபங்கள் இல்லை",
        "contact.prayerWallNoOtherBody": "தினசரி ஜெப வேண்டுதல்கள் இங்கே காட்டப்படும்.",
        "contact.prayerWallNeedMessage": "தயவுசெய்து ஜெப வேண்டுதலை எழுதுங்கள்.",
        "contact.prayerWallPosted": "ஜெப வேண்டுதல் சுவரில் சேர்க்கப்பட்டது.",
        "contact.prayerWallPendingReview": "உங்கள் ஜெப வேண்டுதல் அனுப்பப்பட்டது. நிர்வாகி அங்கீகரித்த பின் சுவரில் தோன்றும்.",
        "admin.prayerApprove": "அங்கீகரி",
        "admin.prayerPendingBadge": "அங்கீகாரத்திற்காக காத்திருக்கிறது",
        "admin.prayerApproved": "ஜெப வேண்டுதல் அங்கீகரிக்கப்பட்டு வெளியிடப்பட்டது.",
        "contact.prayerWallNameAnonymous": "அடையாளமில்லை",
        "contact.prayerWallPrayed": "ஜெபித்தேன் ({count})",
        "contact.prayerWallAnswered": "பதில் கிடைத்தது ({count})",
        "contact.prayerWallThanked": "நன்றி ({count})",
        "contact.prayerWallResetAnswered": "பதில் எண்ணிக்கையை ரீசெட் செய்",
        "contact.prayerWallEdit": "திருத்து",
        "contact.prayerWallDelete": "நீக்கு",
        "contact.prayerWallDetailsTitle": "ஜெப வேண்டுதல் விவரம்",
        "contact.prayerWallCloseDetails": "விவரத்தை மூடு",
        "contact.prayerWallEditPrompt": "ஜெப வேண்டுதலை திருத்துங்கள்",
        "contact.prayerWallDeleteConfirm": "இந்த ஜெப வேண்டுதலை நீக்கவா?",
        "contact.prayerWallUpdated": "ஜெப வேண்டுதல் புதுப்பிக்கப்பட்டது.",
        "contact.prayerWallDeleted": "ஜெப வேண்டுதல் நீக்கப்பட்டது.",
        "contact.prayerWallResetAnsweredDone": "பதில் எண்ணிக்கை ரீசெட் செய்யப்பட்டது.",
        "contact.prayerWallManageDenied": "நிர்வாகி அல்லது பதிவிட்டவர் மட்டும் திருத்த / நீக்க முடியும்.",
        "contact.prayerWallTranslated": "மொழிபெயர்க்கப்பட்டது",
        "contact.prayerWallSyncError": "ஜெப சுவரை ஒத்திசைக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.",
        "contact.prayerWallLoadErrorTitle": "ஜெப சுவரை ஏற்ற முடியவில்லை",
        "contact.prayerWallLoadErrorBody": "இணைப்பைச் சரிபார்த்து மீண்டும் முயற்சிக்கவும்.",
        "mailbox.eyebrow": "அஞ்சல் பெட்டி",
        "mailbox.title": "நிர்வாக அஞ்சல் பெட்டி",
        "mailbox.info": "Share with Us படிவத்தில் வரும் செய்திகள் இங்கே.",
        "mailbox.refresh": "புதுப்பி",
        "mailbox.loadingTitle": "செய்திகள் ஏற்றப்படுகிறது...",
        "mailbox.loadingBody": "தயவுசெய்து காத்திருக்கவும்.",
        "mailbox.emptyTitle": "செய்திகள் இல்லை",
        "mailbox.emptyBody": "புதிய செய்திகள் வந்தால் இங்கே தெரியும்.",
        "mailbox.accessDenied": "இந்த அஞ்சல் பெட்டி நிர்வாகிக்கு மட்டும்.",
        "mailbox.loadErrorTitle": "செய்திகளை ஏற்ற முடியவில்லை",
        "mailbox.loadErrorBody": "சற்று நேரத்தில் மீண்டும் முயற்சிக்கவும்.",
        "mailbox.from": "அனுப்பியவர்",
        "mailbox.markAllRead": "அனைத்தையும் படித்ததாக குறி",
        "mailbox.clearRead": "படித்தவற்றை நீக்கு",
        "mailbox.markRead": "படித்ததாக குறி",
        "mailbox.markUnread": "படிக்காததாக குறி",
        "mailbox.read": "படித்தது",
        "mailbox.unread": "படிக்காதது",
        "mailbox.noReadToClear": "நீக்க படித்த செய்திகள் இல்லை.",
        "admin.eyebrow": "நிர்வாகம்",
        "admin.title": "நிர்வாக பலகை",
        "admin.info": "கோடு இல்லாமல் உள்ளடக்கத்தை நிர்வகிக்கவும்.",
        "admin.refresh": "தரவை புதுப்பி",
        "admin.statsNotices": "அறிவிப்புகள்",
        "admin.statsEvents": "நிகழ்வுகள்",
        "admin.statsSermons": "பிரசங்கங்கள்",
        "admin.statsUrgent": "அவசர ஜெபங்கள்",
        "admin.modulesTitle": "செயலி தொகுதிகள்",
        "admin.modulesInfo": "அனைவருக்கும் பகுதிகளை இயக்க/நிறுத்த. Firebase இல் appConfig/modules-இல் சேமிக்கப்படும். நிறுத்தினால் முகப்பு மற்றும் பட்டியலில் மறையும்; தேவையில் மீண்டும் இயக்கலாம்.",
        "admin.modulesLegend": "உறுப்பினர்களுக்குத் தெரியும்",
        "admin.moduleAnnouncements": "அறிவிப்புகள் (முகப்பு)",
        "admin.moduleBibleReading": "இன்றைய வேத வாசிப்பு (முகப்பு)",
        "admin.moduleDailyVerse": "இன்றைய வசனம் (முகப்பு)",
        "admin.moduleTrivia": "வேதாகமக் கேள்விகள் (முகப்பு, பட்டியல், #trivia)",
        "admin.moduleEventsWeek": "இந்த வார நிகழ்வுகள் (முகப்பு)",
        "admin.moduleDailyBread": "அன்றன்றுள்ள அப்பம்",
        "admin.moduleBookShelf": "நூலகம்",
        "admin.moduleBible": "வேதாகம வாசிப்பாளர்",
        "admin.moduleSongbook": "பாடல் தொகுப்பு",
        "admin.modulePrayer": "ஜெபச் சுவர்",
        "admin.moduleEvents": "நிகழ்வுகள் தாவல்",
        "admin.moduleSermons": "பிரசங்கங்கள்",
        "admin.moduleContact": "தொடர்பு",
        "admin.moduleCelebrations": "விழாக்கள்",
        "admin.moduleChat": "அரட்டை",
        "admin.moduleUserAchievements": "பயனர் சாதனைகள்",
        "admin.moduleKids": "சிறுவர் உலகம்",
        "admin.modulesSave": "தொகுப்பு அமைப்புகளைச் சேமி",
        "admin.modulesSaved": "தொகுப்பு அமைப்புகள் சேமிக்கப்பட்டன.",
        "admin.modulesLoadError": "தொகுப்பு அமைப்புகளை ஏற்ற முடியவில்லை.",
        "admin.modulesSaveError": "சேமிக்க முடியவில்லை. Firestore விதிகளைச் சரிபார்க்கவும் (appConfig/modules).",
        "admin.modulesNeedAdmin": "தொகுப்புகளைத் திருத்த நிர்வாகியாக உள்நுழையவும்.",
        "admin.modulesNoFirebase": "Firebase தயாராக இல்லை.",
        "admin.userAccessTitle": "உறுப்பினர் அணுகல் (சபை / வரையறுக்கப்பட்டது)",
        "admin.userAccessInfo": "வரையறுக்கப்பட்ட உறுப்பினர்: Firebase UID-ஐ உள்ளிட்டு Limited எனத் தேர்ந்து, அனுமதிக்கும் தொகுதிகளைத் தேர்வு செய்து சேமிக்கவும். அவர்கள் சுயவிவரத்தில் காட்ட விரும்பும் பகுதிகளை மேலும் குறைக்கலாம். சபை உறுப்பினர்: Church என விட்டுவிடவும்.",
        "admin.userAccessUidLabel": "Firebase பயனர் ID (UID)",
        "admin.userAccessLoad": "ஏற்று",
        "admin.userAccessSave": "அணுகலைச் சேமி",
        "admin.userAccessTypeLegend": "உறுப்பினர் வகை",
        "admin.userAccessTypeChurch": "சபை உறுப்பினர் — முழு செயலி (உலகளாவிய தொகுப்பு அமைப்புகளின்படி)",
        "admin.userAccessTypeLimited": "வரையறுக்கப்பட்டது — கீழே தேர்ந்தெடுத்த தொகுதிகள் மட்டும்",
        "admin.userAccessModulesLegend": "இந்த UID-க்கு அனுமதிக்கப்பட்ட தொகுதிகள் (Limited போது)",
        "admin.userAccessNeedAdmin": "அணுகலை மாற்ற நிர்வாகியாக உள்நுழையவும்.",
        "admin.userAccessNoFirebase": "Firebase தயாராக இல்லை.",
        "admin.userAccessUidRequired": "உறுப்பினரின் Firebase UID-ஐ உள்ளிடவும்.",
        "admin.userAccessLoaded": "இந்த UID-க்கான அணுகல் ஏற்றப்பட்டது.",
        "admin.userAccessNoDoc": "ஆவணம் இல்லை — இயல்பாக முழுச் சபை உறுப்பினர். Limited எனத் தேர்ந்து தொகுதிகளைத் தேர்ந்து சேமிக்கவும்.",
        "admin.userAccessLoadError": "ஏற்ற முடியவில்லை. userAccess Firestore விதிகளைச் சரிபார்க்கவும்.",
        "admin.userAccessSaved": "சேமிக்கப்பட்டது. உறுப்பினர் செயலியை மீண்டும் திறக்க வேண்டியிருக்கலாம்.",
        "admin.userAccessSaveError": "சேமிக்க முடியவில்லை. userAccess விதிகளைச் சரிபார்க்கவும்.",
        "admin.userAccessModulesRequired": "Limited தேர்வில் குறைந்தது ஒரு தொகுதியையாவது தேர்ந்தெடுக்கவும்.",
        "profile.visibleModulesIntro": "உங்கள் சச்சை சில பகுதிகளை மட்டுமே இயக்கியுள்ளது. மெனுவிலும் முகப்பிலும் காட்ட விரும்பும் பகுதிகளைத் தேர்ந்து சேமி என்பதைத் தட்டவும்.",
        "profile.visibleModulesLegend": "செயலியில் இந்தப் பகுதிகளைக் காட்டு",
        "profile.memberDowngradeBtn": "சாதாரண கணக்கு (முழு சபை உறுப்பினர் அல்ல)",
        "profile.memberDowngradeConfirm": "சாதாரண கணக்குக்கு மாறவா? சபை மீண்டும் மேம்படுத்தும் வரை புதிய பதிவுக்கு அனுமதிக்கப்பட்ட பகுதிகளை மட்டும் காண்பீர்கள்.",
        "profile.memberDowngradeOk": "இப்போது சாதாரண கணக்கு. மெனு மாறவில்லை என்றால் பக்கத்தைப் புதுப்பிக்கவும்.",
        "profile.memberDowngradeFail": "புதுப்பிக்க முடியவில்லை. Firestore விதிகளைச் சபை சரிபார்க்கச் சொல்லி மீண்டும் முயற்சிக்கவும்.",
        "profile.memberDowngradeNeedAuth": "மாற்ற மின்னஞ்சலுடன் உள்நுழையவும்.",
        "profile.memberRedeemFunctionMissing": "உறுப்பினர் குறியீடுகள் Firebase Cloud Functions-இல் இயங்கும்; செயலி கண்டுபிடிக்கவில்லை. redeemMemberCode-ஐ europe-west1-இல் வெளியிடச் சொல்லுங்கள் (Firebase → Functions).",
        "profile.memberRedeemBilling": "Cloud Functions-க்கு Firebase திட்டத்தில் பில்லிங் இயக்க வேண்டியிருக்கலாம். Functions பிழைகளைப் பார்க்கவும்.",
        "profile.memberRedeemNetwork": "சேவையை அடைய முடியவில்லை (இணைப்பு அல்லது உலாவி). Wi‑Fi அல்லது வேறு உலாவியை முயற்சிக்கவும்.",
        "admin.registeredUsersTitle": "பதிவுசெய்த பயனர்கள்",
        "admin.registeredUsersInfo": "பதிவுசெய்த பயனர்களின் பட்டியல். மின்னஞ்சல் கணக்குடன் திறக்கும் ஒவ்வொருவரையும் பார்க்கலாம் (தொகுதி இயக்கம் appConfig-ஆல்).",
        "admin.registeredUsersRefresh": "பட்டியலை புதுப்பி",
        "admin.registeredUsersColName": "பெயர்",
        "admin.registeredUsersColEmail": "மின்னஞ்சல்",
        "admin.registeredUsersColUid": "UID",
        "admin.registeredUsersColSeen": "கடைசியாகப் பார்த்தது",
        "admin.registeredUsersEmpty": "இன்னும் பட்டியலில் யாரும் இல்லை. மின்னஞ்சலுடன் செயலியைத் திறந்த பிறகு தோன்றும்.",
        "admin.registeredUsersLoaded": "பதிவுசெய்த பயனர்கள் ஏற்றப்பட்டனர்.",
        "admin.registeredUsersLoadError": "ஏற்ற முடியவில்லை. userDirectory-க்கான Firestore விதிகளைச் சரிபார்க்கவும்.",
        "admin.noticeTitle": "அறிவிப்பு அனுப்பு",
        "admin.noticeTitlePlaceholder": "அறிவிப்பு தலைப்பு",
        "admin.noticeTitleTaPlaceholder": "அறிவிப்பு தலைப்பு (தமிழ், விருப்பம்)",
        "admin.noticeBodyPlaceholder": "அறிவிப்பு செய்தி",
        "admin.noticeBodyTaPlaceholder": "அறிவிப்பு செய்தி (தமிழ், விருப்பம்)",
        "admin.noticeImagePlaceholder": "பேனர் பட URL (https://, http:// அல்லது image பாதை, விருப்பம்)",
        "admin.noticeTypeHint": "உரை அறிவிப்பு இயல்புநிலை பேனரை பயன்படுத்தும். படம் மட்டும் பேனருக்கு தலைப்பு/செய்தியை காலியாகவிட்டு பட URL மட்டும் இடுங்கள்.",
        "admin.noticeImageSizeHint": "படம் மட்டும்: முழு அட்டை அகலம்; உயரம் உங்கள் படத்திற்கு ஏற்ப (1200×800 = 3:2). மிக நீளமான படங்கள் ~78vh வரை. முழு படம்—வெட்டாது. மூலைகள் வட்டமானவை.",
        "admin.noticeLinkPlaceholder": "எ.கா. #sermons அல்லது முழு URL (https://…)",
        "admin.noticeImageOnly": "முகப்பில் படம் மட்டும் பதாகையாக காட்டு",
        "admin.noticeUrgent": "அவசரமாக குறிக்கவும்",
        "admin.noticeImportant": "முக்கியமாக குறிக்கவும் (முகப்பு அட்டை)",
        "admin.noticeScheduleHint": "அட்டவணை (விருப்பம்): தேதிகளை காலியாக விட்டால் நீங்கள் நீக்கும் வரை காட்டும். முடிவு தேதி — கடைசி நாள் அறிவிப்பு தோன்றும்.",
        "admin.noticeVisibleFrom": "இதிலிருந்து காட்டு",
        "admin.noticeVisibleUntil": "இந்த தேதி வரை",
        "admin.noticeScheduleLine": "காட்டு: {from} – {until}",
        "admin.noticeScheduleFrom": "தொடக்கம் {date}",
        "admin.noticeScheduleUntil": "முடிவு {date}",
        "admin.noticeScheduleOpen": "முடிவு தேதி இல்லை (தொடரும்)",
        "admin.noticeEditPromptVisibleFrom": "காட்டு தொடக்க தேதி (YYYY-MM-DD, காலி = இப்போதிலிருந்து)",
        "admin.noticeEditPromptVisibleUntil": "காட்டு முடிவு தேதி (YYYY-MM-DD, காலி = முடிவு இல்லை)",
        "admin.noticeScheduleInvalid": "தொடக்க தேதி முடிவு தேதிக்கு முன் அல்லது சமமாக இருக்க வேண்டும்.",
        "admin.noticeImageOnlyTag": "படம் மட்டும்",
        "admin.noticeImageOnlyLabel": "படம் மட்டும் பதாகை",
        "admin.noticeImageOnlyBody": "இது முகப்பில் பதாகையாக காட்டப்படும். தலைப்பும் செய்தியும் காலியாக இருந்தால் படம் மட்டும்.",
        "admin.noticeNeedImage": "படம் மட்டும் அறிவிப்புக்கு பதாகை படம் URL தேவை.",
        "admin.noticeNeedImageUrl": "பேனர் படம் https://, http://, செல்லுபடியாகும் image பாதை அல்லது data URL ஆக இருக்க வேண்டும்.",
        "admin.noticeUrgentTag": "அவசரம்",
        "admin.noticeImportantTag": "முக்கியம்",
        "admin.noticeEditPromptImage": "பேனர் பட URL-ஐ திருத்து (https, http, பாதை அல்லது data URL; விருப்பம்)",
        "admin.noticeEditPromptImageOnly": "முகப்பில் படம் மட்டும் பதாகையா? y அல்லது n என்று type செய்யவும் (காலியாக விட்டால் மாறாது)",
        "admin.noticeImageOnlyTitle": "படம் மட்டும் பேனர்",
        "admin.noticeEditPromptImportant": "முக்கிய குறிச்சொல்? y அல்லது n (காலியாக விட்டால் மாறாது)",
        "admin.noticePublish": "அறிவிப்பை வெளியிடு",
        "admin.noticeManageTitle": "சமீப அறிவிப்புகள்",
        "admin.noticeManageInfo": "நீங்கள் வெளியிட்ட அறிவிப்புகளை திருத்த அல்லது நீக்கவும்.",
        "admin.noticeEdit": "திருத்து",
        "admin.noticeDelete": "நீக்கு",
        "admin.noticeDeleteConfirm": "இந்த அறிவிப்பை நீக்கவா?",
        "admin.noticeEditPromptTitle": "தலைப்பை திருத்து",
        "admin.noticeEditPromptBody": "செய்தியை திருத்து",
        "admin.noticeEditPromptTitleTa": "தமிழ் தலைப்பை திருத்து (விருப்பம்)",
        "admin.noticeEditPromptBodyTa": "தமிழ் செய்தியை திருத்து (விருப்பம்)",
        "admin.noticeEditPromptLink": "இணைப்பை திருத்து (விருப்பம்)",
        "admin.noticeUpdated": "அறிவிப்பு புதுப்பிக்கப்பட்டது.",
        "admin.noticeDeleted": "அறிவிப்பு நீக்கப்பட்டது.",
        "admin.noticeEmptyTitle": "அறிவிப்புகள் இல்லை",
        "admin.noticeEmptyBody": "நீங்கள் வெளியிட்ட அறிவிப்புகள் இங்கே தோன்றும்.",
        "admin.broadcastTitle": "அறிவிப்பு ஒலிபரப்பு",
        "admin.broadcastInfo": "ஒரு செய்தியை எழுதி வகைபடி எல்லா பயனர்களுக்கும் அனுப்புங்கள்.",
        "admin.broadcastTitlePlaceholder": "ஒலிபரப்பு தலைப்பு",
        "admin.broadcastTitleTaPlaceholder": "ஒலிபரப்பு தலைப்பு (தமிழ், விருப்பம்)",
        "admin.broadcastBodyPlaceholder": "ஒலிபரப்பு செய்தி",
        "admin.broadcastBodyTaPlaceholder": "ஒலிபரப்பு செய்தி (தமிழ், விருப்பம்)",
        "admin.broadcastLinkPlaceholder": "விருப்ப வழிநடத்தல் இணைப்பு (#events அல்லது https://...)",
        "admin.broadcastSend": "ஒலிபரப்பை அனுப்பு",
        "admin.broadcastRecentTitle": "சமீப ஒலிபரப்புகள்",
        "admin.broadcastRecentInfo": "பயனர்களுக்கு அனுப்பிய சமீப செய்திகள்.",
        "admin.broadcastCategoryGeneral": "பொது",
        "admin.broadcastCategoryEvents": "நிகழ்வுகள்",
        "admin.broadcastCategorySermons": "பிரசங்கங்கள்",
        "admin.broadcastCategoryPrayer": "ஜெபம்",
        "admin.broadcastCategoryContact": "தொடர்பு",
        "admin.broadcastNeedFields": "ஒலிபரப்பு தலைப்பு மற்றும் செய்தியை உள்ளிடவும்.",
        "admin.broadcastSaved": "ஒலிபரப்பு அனுப்பப்பட்டது.",
        "admin.broadcastEmptyTitle": "ஒலிபரப்புகள் இல்லை",
        "admin.broadcastEmptyBody": "நீங்கள் அனுப்பிய ஒலிபரப்புகள் இங்கே தோன்றும்.",
        "admin.broadcastEdit": "திருத்து",
        "admin.broadcastDelete": "நீக்கு",
        "admin.broadcastDeleteConfirm": "இந்த ஒலிபரப்பை நீக்கவா?",
        "admin.broadcastEditPromptTitle": "தலைப்பை திருத்து",
        "admin.broadcastEditPromptBody": "செய்தியை திருத்து",
        "admin.broadcastEditPromptTitleTa": "தமிழ் தலைப்பை திருத்து (விருப்பம்)",
        "admin.broadcastEditPromptBodyTa": "தமிழ் செய்தியை திருத்து (விருப்பம்)",
        "admin.broadcastEditPromptCategory": "வகையை திருத்து (general/events/sermons/prayer/contact)",
        "admin.broadcastEditPromptUrl": "இலக்கு இணைப்பை திருத்து",
        "admin.broadcastUpdated": "ஒலிபரப்பு புதுப்பிக்கப்பட்டது.",
        "admin.broadcastDeleted": "ஒலிபரப்பு நீக்கப்பட்டது.",
        "admin.eventTitle": "நிகழ்வு சேர்க்க",
        "admin.eventTitlePlaceholder": "நிகழ்வு தலைப்பு",
        "admin.eventDescriptionPlaceholder": "விளக்கம்",
        "admin.eventTypeSpecial": "சிறப்பு",
        "admin.eventTypeRecurring": "மறுமுறை",
        "admin.eventPublish": "நிகழ்வு சேர்க்க",
        "admin.eventManageTitle": "சமீப நிகழ்வுகள்",
        "admin.eventManageInfo": "நீங்கள் சேர்த்த நிகழ்வுகளை திருத்த அல்லது நீக்கவும்.",
        "admin.eventEdit": "திருத்து",
        "admin.eventDelete": "நீக்கு",
        "admin.eventDeleteConfirm": "இந்த நிகழ்வை நீக்கவா?",
        "admin.eventEditPromptTitle": "நிகழ்வு தலைப்பை திருத்து",
        "admin.eventEditPromptDate": "தேதியை திருத்து (YYYY-MM-DD)",
        "admin.eventEditPromptTime": "நேரத்தை திருத்து (HH:MM)",
        "admin.eventEditPromptType": "வகையை திருத்து (Special/Recurring)",
        "admin.eventEditPromptDescription": "விளக்கத்தை திருத்து",
        "admin.eventUpdated": "நிகழ்வு புதுப்பிக்கப்பட்டது.",
        "admin.eventDeleted": "நிகழ்வு நீக்கப்பட்டது.",
        "admin.eventEmptyTitle": "நிகழ்வுகள் இல்லை",
        "admin.eventEmptyBody": "நீங்கள் சேர்த்த நிகழ்வுகள் இங்கே தோன்றும்.",
        "admin.triviaTitle": "வேதாகமக் கேள்விகள் (தமிழ்)",
        "admin.triviaInfo": "தமிழில் வேதாகமக் கேள்விகளை சேர்க்கவும். 4 விடை விருப்பங்கள் தேவை. திங்கள்–வெள்ளி பெல்ஜியம் நேர நள்ளிரவு முதல் காண்பிக்கப்படும்.",
        "admin.triviaQuestionPlaceholder": "வினா தமிழில்",
        "admin.triviaOption1": "விருப்பம் 1",
        "admin.triviaOption2": "விருப்பம் 2",
        "admin.triviaOption3": "விருப்பம் 3",
        "admin.triviaOption4": "விருப்பம் 4",
        "admin.triviaCorrectLabel": "சரியான விருப்பம்:",
        "admin.triviaReferencePlaceholder": "வேத மேற்கோள் (விரும்பினால்)",
        "admin.triviaDatePlaceholder": "தேதி",
        "admin.triviaPublish": "கேள்வி சேர்",
        "admin.triviaManageTitle": "சமீப வேதாகமக் கேள்விகள்",
        "admin.triviaEmptyTitle": "வேதாகமக் கேள்விகள் இல்லை",
        "admin.triviaEmptyBody": "தமிழில் வேதாகமக் கேள்விகளை சேர்க்கவும். 4 விடை விருப்பங்கள் தேவை.",
        "admin.saving": "சேமிக்கிறது...",
        "admin.loginRequired": "நிர்வாகியாக உள்நுழையவும்.",
        "admin.loadErrorTitle": "ஏற்ற முடியவில்லை",
        "admin.loadErrorBody": "மேலே உள்ள 새ோதனை பொத்தானை தட்டி மீண்டும் முயற்சிக்கவும்.",
        "admin.refreshHelp": "பட்டியல்கள் ஏற்றப்படவில்லை என்றால், மேலே உள்ள 새ோதனை தட்டுங்கள்.",
        "admin.triviaNeedFields": "கேள்வி மற்றும் 4 விருப்பங்களை உள்ளிடவும்.",
        "admin.triviaNeedDate": "சரியான தேதியை உள்ளிடவும் (YYYY-MM-DD).",
        "admin.triviaSaved": "வேதாகமக் கேள்வி சேர்க்கப்பட்டது.",
        "admin.triviaEdit": "திருத்து",
        "admin.triviaDelete": "நீக்கு",
        "admin.triviaDeleteConfirm": "இந்த வேதாகமக் கேள்வியை நீக்கவா?",
        "admin.triviaEditPromptQuestion": "கேள்வியை திருத்து (தமிழ்)",
        "admin.triviaEditPromptOption": "விருப்பம்",
        "admin.triviaEditPromptCorrect": "சரியான விருப்பம் (1-4)",
        "admin.triviaEditPromptReference": "மேற்கோள் திருத்து (விரும்பினால்)",
        "admin.triviaEditPromptDate": "தேதி திருத்து (YYYY-MM-DD)",
        "admin.triviaUpdated": "வேதாகமக் கேள்வி புதுப்பிக்கப்பட்டது.",
        "admin.triviaDeleted": "வேதாகமக் கேள்வி நீக்கப்பட்டது.",
        "admin.sermonTitle": "பிரசங்கம் சேர்க்க",
        "admin.sermonTitlePlaceholder": "தமிழ் தலைப்பு",
        "admin.sermonSubtitlePlaceholder": "ஆங்கில துணைத்தலைப்பு",
        "admin.sermonSpeakerPlaceholder": "பேச்சாளர் பெயர்",
        "admin.sermonAudioPlaceholder": "ஆடியோ URL (https://...)",
        "admin.sermonPublish": "பிரசங்கம் சேர்க்க",
        "admin.sermonManageTitle": "சமீப பிரசங்கங்கள்",
        "admin.sermonManageInfo": "நீங்கள் சேர்த்த பிரசங்கங்களை திருத்த அல்லது நீக்கவும்.",
        "admin.sermonEdit": "திருத்து",
        "admin.sermonDelete": "நீக்கு",
        "admin.sermonDeleteConfirm": "இந்த பிரசங்கத்தை நீக்கவா?",
        "admin.sermonEditPromptTitle": "தமிழ் தலைப்பை திருத்து",
        "admin.sermonEditPromptSubtitle": "ஆங்கில துணைத்தலைப்பை திருத்து",
        "admin.sermonEditPromptSpeaker": "பேச்சாளர் பெயரை திருத்து",
        "admin.sermonEditPromptDate": "தேதியை திருத்து (YYYY-MM-DD)",
        "admin.sermonEditPromptAudio": "ஆடியோ இணைப்பை திருத்து",
        "admin.sermonUpdated": "பிரசங்கம் புதுப்பிக்கப்பட்டது.",
        "admin.sermonDeleted": "பிரசங்கம் நீக்கப்பட்டது.",
        "admin.sermonEmptyTitle": "பிரசங்கங்கள் இல்லை",
        "admin.sermonEmptyBody": "நீங்கள் சேர்த்த பிரசங்கங்கள் இங்கே தோன்றும்.",
        "admin.triviaTitle": "வேதாகமக் கேள்விகள் (தமிழ்)",
        "admin.triviaInfo": "தமிழ் வேதாகமக் கேள்விகளை சேர்க்கவும். திங்கள்–வெள்ளி திட்டமிடப்பட்ட தேதியில் பெல்ஜியம் நேர நள்ளிரவு முதல் காண்பிக்கப்படும்.",
        "admin.triviaQuestionPlaceholder": "கேள்வி (தமிழ்)",
        "admin.triviaOptionsPlaceholder": "விருப்பங்கள் (ஒரு வரியில் ஒன்று)",
        "admin.triviaCorrectPlaceholder": "சரியான விருப்ப குறியீடு (0 முதல்)",
        "admin.triviaReferencePlaceholder": "வேத மேற்கோள் (எ.கா. யோவான் 3:16)",
        "admin.triviaAdd": "வேதாகமக் கேள்வி சேர்க்க",
        "admin.triviaManageTitle": "திட்டமிடப்பட்ட வேதாகமக் கேள்விகள்",
        "admin.triviaEmptyTitle": "வேதாகமக் கேள்விகள் இல்லை",
        "admin.triviaEmptyBody": "தமிழ் வேதாகமக் கேள்விகளை சேர்க்கவும். திட்டமிடப்பட்ட தேதியில் பெல்ஜியம் நேர நள்ளிரவு முதல் காண்பிக்கப்படும்.",
        "admin.triviaQuestion": "கேள்வி",
        "admin.triviaEdit": "திருத்து",
        "admin.triviaDelete": "நீக்கு",
        "admin.triviaDeleteConfirm": "இந்த வேதாகமக் கேள்வியை நீக்கவா?",
        "admin.triviaEditPromptQuestion": "கேள்வியை திருத்து (தமிழ்)",
        "admin.triviaEditPromptOptions": "விருப்பங்களை திருத்து (ஒரு வரியில் ஒன்று)",
        "admin.triviaEditPromptCorrect": "சரியான விருப்ப குறியீடு (0 முதல்)",
        "admin.triviaEditPromptReference": "வேத மேற்கோள் (விருப்பம்)",
        "admin.triviaEditPromptShowDate": "காண்பிக்கும் தேதி (YYYY-MM-DD)",
        "admin.triviaUpdated": "வேதாகமக் கேள்வி புதுப்பிக்கப்பட்டது.",
        "admin.triviaDeleted": "வேதாகமக் கேள்வி நீக்கப்பட்டது.",
        "admin.triviaSaved": "வேதாகமக் கேள்வி சேர்க்கப்பட்டது.",
        "admin.triviaNeedFields": "கேள்வி, குறைந்தது ஒரு விருப்பம் மற்றும் காண்பிக்கும் தேதியை உள்ளிடவும்.",
        "admin.triviaNeedDate": "காண்பிக்கும் தேதி YYYY-MM-DD ஆக இருக்க வேண்டும்.",
        "admin.prayerTitle": "அவசர ஜெபத்தை பின் செய்",
        "admin.prayerInfo": "ஜெப வேண்டுதல்களின் அவசர நிலையை மாற்றவும்.",
        "admin.prayerPin": "அவசரமாக குறி",
        "admin.prayerUnpin": "அவசர குறியை நீக்கு",
        "admin.prayerUpdated": "ஜெப அவசர நிலை புதுப்பிக்கப்பட்டது.",
        "admin.prayerExportPdf": "ஜெப வேண்டுதல்களை PDF ஆக ஏற்றுமதி",
        "admin.prayerExportDocTitle": "ஜெபச் சுவர் — NJC Belgium",
        "admin.prayerExportGenerated": "உருவாக்கப்பட்ட நேரம்",
        "admin.prayerExportUrgent": "அவசரம்",
        "admin.prayerExportPastorOnly": "ஊழியருக்கு மட்டும்",
        "admin.prayerExportAnonymous": "அடையாளமற்ற பதிவு",
        "admin.prayerExportDate": "பதிவு",
        "admin.prayerExportCount": "மொத்த வேண்டுதல்கள்: {count}",
        "admin.prayerExportDenied": "ஜெப வேண்டுதல்களை ஏற்றுமதி செய்ய நிர்வாகி மட்டுமே.",
        "admin.prayerExportEmpty": "ஏற்றுமதிக்கு ஜெப வேண்டுதல்கள் இல்லை. முதலில் பலகையை புதுப்பிக்கவும்.",
        "admin.prayerExportPopupBlocked": "PDF-க்கு இந்த தளத்தில் pop-up-ஐ அனுமதிக்கவும், அல்லது உலாவியின் அச்சு பயன்பாட்டைப் பயன்படுத்தவும்.",
        "admin.prayerExportLoadError": "ஏற்றுமதிக்கு ஜெபங்களை ஏற்ற முடியவில்லை.",
        "admin.prayerExportSubtitle": "சபை ஜெபச் சுவரிலிருந்து — ஜெபம் மற்றும் தொடர்ச்சிக்கு.",
        "admin.prayerExportUrgentCount": "அவசரம்: {n}",
        "admin.prayerExportFooter": "ஜெபச் சுவர் ஏற்றுமதி · ஊழியப் பயன்பாட்டிற்கு · வேண்டுதல்களை ரகசியமாக வைக்கவும்.",
        "admin.loading": "நிர்வாக பலகை ஏற்றப்படுகிறது...",
        "admin.loadingBody": "தயவுசெய்து காத்திருக்கவும்.",
        "admin.emptyPrayersTitle": "ஜெப வேண்டுதல்கள் இல்லை",
        "admin.emptyPrayersBody": "புதிய ஜெபங்கள் இங்கே தோன்றும்.",
        "admin.noticeNeedFields": "அறிவிப்பு தலைப்பு மற்றும் செய்தியை உள்ளிடவும்.",
        "admin.noticeNeedImageUrl": "பேனர் பட URL https:// அல்லது செல்லுபடியாகும் image பாதையாக இருக்க வேண்டும்.",
        "admin.noticeNeedImage": "படம் மட்டும் அறிவிப்புக்கு பதாகை படம் URL தேவை.",
        "admin.eventNeedFields": "நிகழ்வு தலைப்பு மற்றும் தேதியை உள்ளிடவும்.",
        "admin.sermonNeedFields": "பிரசங்க தலைப்பு, தேதி மற்றும் ஆடியோ URL தேவை.",
        "admin.noticeSaved": "அறிவிப்பு வெளியிடப்பட்டது.",
        "admin.noticePublishFailed": "வெளியிட முடியவில்லை. இணைப்பை சரிபார்த்து மீண்டும் முயற்சிக்கவும்.",
        "admin.eventSaved": "நிகழ்வு சேர்க்கப்பட்டது.",
        "admin.sermonSaved": "பிரசங்கம் சேர்க்கப்பட்டது.",
        "admin.saved": "சேமிக்கப்பட்டது.",
        "admin.validation": "தேவையான புலங்களை நிரப்பவும்.",
        "admin.syncError": "நிர்வாக தரவை ஏற்ற முடியவில்லை.",
        "admin.accessDenied": "இந்த பலகை நிர்வாகிக்கு மட்டும்.",
        "common.at": "மணிக்கு",
        "common.belgiumTime": "பெல்ஜியம் நேரம்",
        "common.today": "இன்று",
        "settings.open": "அமைப்புகளை திற",
        "settings.eyebrow": "அமைப்புகள்",
        "settings.title": "அமைப்புகள்",
        "settings.info": "செயலி அமைப்புகள் மற்றும் விருப்பங்கள்.",
        "settings.theme": "தீம்",
        "settings.themeMode": "ஒளி / இருள்",
        "settings.themeColor": "நிற தீம்",
        "settings.themeColorHint": "பின்னணி மற்றும் நிறங்களை மாற்று (பிரகாசம் மேலே).",
        "settings.paletteDefault": "கிளாசிக் (சிவப்பு & வெள்ளை)",
        "settings.paletteOcean": "ஓசியன் (நீல-பச்சை)",
        "settings.paletteForest": "காடு (பச்சை)",
        "settings.paletteSunset": "சன்செட் (நாரஞ்சு)",
        "settings.paletteSlate": "ஸ்லேட் (சாம்பல்-நீலம்)",
        "settings.themeLight": "ஒளி நிலை",
        "settings.themeDark": "இருள் நிலை",
        "settings.language": "மொழி",
        "settings.languageEnglish": "ஆங்கிலம்",
        "settings.languageTamil": "தமிழ்",
        "settings.notifications": "அறிவிப்புகள்",
        "settings.notificationsOn": "இயக்கத்தில்",
        "settings.notificationsOff": "நிறுத்தப்பட்டுள்ளது",
        "settings.notificationsBlocked": "தடுக்கப்பட்டுள்ளது",
        "settings.notificationsUnsupported": "ஆதரவு இல்லை",
        "settings.checkForUpdates": "புதுப்பிப்புகளை சரிபார்க்கவும்",
        "settings.updateChecking": "சரிபார்க்கிறது...",
        "settings.updateAvailable": "புதிய பதிப்பு கிடைக்கிறது!",
        "settings.updateUpToDate": "நீங்கள் புதுப்பிக்கப்பட்டுள்ளீர்கள்.",
        "settings.updateError": "சரிபார்க்க முடியவில்லை.",
        "settings.appVersion": "செயலி பதிப்பு",
        "settings.largerText": "பெரிய உரை",
        "settings.largerTextOn": "ஆன்",
        "settings.largerTextOff": "ஆஃப்",
        "settings.fonts": "எழுத்துருக்கள்",
        "settings.fontsClosed": "மூடியுள்ளது",
        "settings.fontsOpen": "திறந்துள்ளது",
        "settings.fontEnglish": "ஆங்கில உரை",
        "settings.fontTamil": "தமிழ் உரை",
        "settings.fontPreviewEn": "முன்னோட்டம் (ஆங்கிலம்)",
        "settings.fontPreviewTa": "முன்னோட்டம் (தமிழ்)",
        "settings.fontEnInter": "Inter (இயல்புநிலை)",
        "settings.fontEnDmSans": "DM Sans",
        "settings.fontEnSourceSans": "Source Sans 3",
        "settings.fontEnOpenSans": "Open Sans",
        "settings.fontEnLato": "Lato",
        "settings.fontEnSystem": "கணினி / சாதன எழுத்துரு",
        "settings.fontTaNoto": "Noto Sans Tamil (இயல்புநிலை)",
        "settings.fontTaMuktaMalar": "Mukta Malar",
        "settings.fontTaHindMadurai": "Hind Madurai",
        "settings.fontTaCatamaran": "Catamaran",
        "settings.fontTaSystem": "கணினி தமிழ் எழுத்துரு",
        "profile.eyebrow": "சுயவிவரம்",
        "profile.title": "உங்கள் சுயவிவரம்",
        "profile.info": "உங்கள் விவரங்களை புதுப்பிக்கவும்.",
        "profile.fullName": "முழுப் பெயர்",
        "profile.dob": "பிறந்த தேதி",
        "profile.anniversary": "திருமண நாள்",
        "profile.anniversaryHelp": "விருப்பம். அமைத்தால், முகப்பில் உங்கள் திருமண நாளில் வாழ்த்து காட்டப்படும்.",
        "profile.anniversaryPartnerName": "திருமண நாளுக்கு மனைவி/கணவர் பெயர்",
        "profile.anniversaryPartnerPlaceholder": "எ.கா. மரியா",
        "profile.anniversaryPartnerHelp": "திருமண நாளன்று விழாக்கள் மற்றும் முகப்பில் காட்டப்படும்.",
        "profile.wishesHowItWorks": "பிறந்தநாள்/திருமண நாள்: அன்று முகப்பில் வாழ்த்து தோன்றும்; பட்டியல் → இன்றைய விழாக்கள் என்பதில் சென்று செய்தி அனுப்பவும். பல நிகழ்வுகள் ஒரே நாளில் இருந்தால் ஒரே அறிவிப்பில் சேர்க்கப்படும்.",
        "profile.familyTitle": "குடும்ப பிறந்தநாட்கள்",
        "profile.familyIntro": "நினைவில் கொள்ள விரும்பும் நபர்களைச் சேர்க்கவும். அவர்களின் பிறந்தநாளில் முகப்பில் வாழ்த்து தோன்றும்.",
        "profile.familyAddMember": "குடும்ப உறுப்பினரைச் சேர்",
        "profile.familyName": "பெயர்",
        "profile.familyBirthday": "பிறந்தநாள்",
        "profile.familyRemove": "நீக்கு",
        "profile.phone": "தொலைபேசி எண்",
        "profile.photo": "புகைப்படம் (விருப்பம்)",
        "profile.photoHelp": "உங்கள் சாதனத்தில் இருந்து புகைப்படம் தேர்ந்தெடுக்கவும்.",
        "profile.photoReadError": "புகைப்படத்தை ஏற்ற முடியவில்லை. மீண்டும் முயற்சிக்கவும்.",
        "profile.photoTooLarge": "புகைப்படம் மிகப் பெரியது. சிறிய கோப்பை தேர்ந்தெடுக்கவும்.",
        "profile.save": "சுயவிவரம் சேமி",
        "profile.saved": "சுயவிவரம் சேமிக்கப்பட்டது.",
        "profile.savedLocal": "இந்த சாதனத்தில் சேமிக்கப்பட்டது. இணையம் கிடைக்கும் போது மேகத்தில் ஒத்திசைக்கும்.",
        "profile.cloudPermissionDenied": "இந்த சாதனத்தில் சேமிக்கப்பட்டது. மேக ஒத்திசைவு Firestore பாதுகாப்பு விதிகளால் தடுக்கப்பட்டது — நிர்வாகியை தொடர்பு கொள்ளவும்.",
        "profile.loginRequired": "சுயவிவரத்தை நிர்வகிக்க முதலில் உள்நுழையவும்.",
        "profile.triviaPoints": "வேதாகமக் கேள்விகள் புள்ளிகள்",
        "profile.badgesEmptyReadingOnly": "படிப்பதன் மூலம் பதக்கங்களைப் பெறுங்கள்.",
        "profile.readingPoints": "வேத வாசிப்பு புள்ளிகள்",
        "profile.totalPoints": "மொத்த புள்ளிகள்",
        "profile.achievementsTitle": "சாதனைகள்",
        "profile.achievementsInfo": "செயலியில் செயல்பாடுகளிலிருந்து பெற்ற புள்ளிகள்.",
        "app.updateAvailable": "புதிய பதிப்பு கிடைக்கிறது.",
        "app.refreshToUpdate": "புதுப்பிக்க கிளிக் செய்யவும்",
        "app.updateTitle": "புதுப்பிப்பு தயார்",
        "app.updateLead": "மேம்பாடுகள் மற்றும் சரிப்புகளுடன் புதிய பதிப்பு தயார்.",
        "app.updateHint": "நிறுவுதலை முடிக்க மீண்டும் ஏற்ற \"இப்போது புதுப்பி\" என தட்டவும்.",
        "app.updateNow": "இப்போது புதுப்பி",
        "app.updateLater": "இப்போது வேண்டாம்",
        "app.updateDismissAria": "உரையாடலை மூடு",
        "userAchievements.eyebrow": "சமூகம்",
        "userAchievements.title": "பயனர் சாதனைகள்",
        "userAchievements.subtitle": "வேதாகமக் கேள்விகள் மற்றும் வேத வாசிப்பு புள்ளிகள்",
        "kids.eyebrow": "சிறுவர் உலகம்",
        "kids.title": "சிறுவர் உலகம்",
        "kids.subtitle": "எளிய நடவடிக்கைகள்",
        "kids.tagline": "கற்றுக்கொள் · விளையாடு · விசுவாசத்தில் வளர்",
        "kids.tabGames": "விளையாட்டுகள்",
        "kids.tabBooks": "புத்தகங்கள்",
        "kids.tabAudios": "ஆடியோ",
        "kids.tabVideos": "வீடியோ",
        "kids.booksLead": "உங்கள் சபை தேர்ந்தெடுத்த சிறுவர் புத்தகங்கள்.",
        "kids.booksFullLibrary": "முழு சபை நூலகம்",
        "kids.booksLoading": "ஏற்றுகிறது…",
        "kids.booksEmpty": "இன்னும் சிறுவர் புத்தகங்கள் இல்லை. நிர்வாக பலகையில் «சிறுவர் உலகம்» தேர்ந்தெடுத்துச் சேர்க்கவும்.",
        "kids.booksError": "பட்டியலை ஏற்ற முடியவில்லை. பின்னர் முயலவும்.",
        "kids.booksRead": "நூலைத் திற",
        "kids.booksDownloadAria": "பதிவிறக்க",
        "kids.booksHint": "குறிப்பு: பெற்றோருடன் இணைந்து ஒன்றைத் தேர்ந்தெடுக்கவும்.",
        "kids.audiosLead": "உங்கள் சபை தேர்ந்தெடுத்த கதைகள் மற்றும் பாடல்கள் — அமைதியான நேரத்திற்கு ஏற்றது.",
        "kids.audiosCtaMore": "மேலும் பிரசங்கங்கள்",
        "kids.audiosBibleCta": "வேத வாசிப்பு (கேட்க)",
        "kids.audiosHint": "விரும்பினால் ஹெட்ஃபோன் பயன்படுத்தவும்; சிறிய குழந்தைகளுக்குப் பெற்றோர் அருகில் இருக்கவும்.",
        "kids.audiosMoreLinks": "மேலும்",
        "kids.audioNowPlayingHeader": "சிறுவர் ஆடியோ",
        "kids.audioNowPlayingShort": "ஆடியோ",
        "kids.audioPlayerAria": "சிறுவர் ஆடியோ இயக்கி",
        "kids.audioWheelAria": "இசை கட்டுப்பாடுகள்",
        "kids.audioPrevious": "முந்தைய தடம்",
        "kids.audioNext": "அடுத்த தடம்",
        "kids.audioTapToPlay": "இயக்க தட்டவும்",
        "kids.audioPlayThis": "இயக்கு",
        "player.openKidsAudioPlayer": "முழு இசை இயக்கியைத் திற",
        "kids.audioPlay": "இயக்கு",
        "kids.audioLoading": "ஆடியோ பட்டியல் ஏற்றுகிறது…",
        "kids.audioEmpty": "இன்னும் ஆடியோ இல்லை. நிர்வாக பலகையில் இணைப்புகளைச் சேர்க்கலாம்.",
        "kids.audioError": "ஆடியோவை ஏற்ற முடியவில்லை. பின்னர் முயலவும்.",
        "kids.audioUntitled": "தலைப்பில்லை",
        "kids.audioClosePlayer": "இசை இயக்கியை மூடு",
        "kids.videosLead": "குடும்பத்திற்கு ஏற்ற காட்சிகள் — சபை நூலகத்தில் இணைப்புகளைச் சேர்க்கலாம்.",
        "kids.videosCta": "வீடியோக்களுக்கு நூலகத்தை உலாவு",
        "kids.videosHint": "பெற்றோர்: திரை நேரத்தை மேற்பார்வை செய்து உங்கள் குடும்பத்திற்குப் பொருந்துவதைத் தேர்ந்தெடுக்கவும்.",
        "kids.lead": "பிள்ளைகளுக்கான எளிய, தேவனைப் பற்றிய விளையாட்டுகள். பெற்றோருடன் இணைந்து நன்று.",
        "kids.parentNote": "பெரியவர்கள்: ஞாயிறு பள்ளி, வீடு, பயணம் — எங்கும் இதைப் பயன்படுத்தலாம்.",
        "kids.starsLine": "உங்கள் நட்சத்திரங்கள்: {n}",
        "kids.memLevelLabel": "நிலை",
        "kids.memLevelEasy": "எளிது",
        "kids.memLevelNormal": "இடை",
        "kids.memLevelTough": "கடினம்",
        "kids.memDeckLabel": "படங்கள்",
        "kids.memDeck0": "பைபிள் & உலகம்",
        "kids.memDeck1": "சபை & துதி",
        "kids.memDeck2": "நம்பிக்கை பயணம்",
        "kids.memScoreLine": "இந்த சுற்று: {run} / சிறந்த: {best}",
        "kids.wordLevelLabel": "நிலை",
        "kids.wordLevelEasy": "எளிது (குறுகிய)",
        "kids.wordLevelNormal": "இடை",
        "kids.wordLevelHard": "கடினம் (நீளமான)",
        "kids.wordScoreLine": "இந்த விளையாட்டு: {run} / தீர்வு: {n}",
        "kids.memTitle": "பைபிள் ஜோடி படங்கள்",
        "kids.memHelp": "இரண்டு ஒரே படங்களைக் கண்டுபிடி. ஒரு கார்டைத் தட்டி, ஜோடியையும் தட்டு.",
        "kids.memStatusStart": "எல்லா ஜோடிகளையும் கண்டுபிடி.",
        "kids.memStatusGood": "நன்று! தொடருங்கள்.",
        "kids.memStatusTry": "பொருந்தவில்லை. மீண்டும் முயல்க.",
        "kids.memWon": "அனைத்து ஜோடிகளையும் கண்டுபிடித்தீர்கள்! அருமை.",
        "kids.memNew": "புது விளையாட்டு",
        "kids.scrambleTitle": "எழுத்து ஒழுங்கு",
        "kids.scrambleHint": "எழுத்துகளை வரிசையாக நிரப்பு. எழுத்தைத் தட்டி, வரிசையிலுள்ள காலியிடத்தில் நிரப்பு. திரும்பப் பெற நிரப்பப்பட்ட இடத்தைத் தட்டு.",
        "kids.scrambleCheck": "சரி பார்",
        "kids.scrambleNext": "அடுத்த வார்த்தை",
        "kids.scrambleOk": "சரியாக எழுதிவிட்டீர்கள்!",
        "kids.scrambleBad": "இன்னும் அல்ல. எல்லா இடங்களையும் நிரப்பி முயலுங்கள்.",
        "kids.verseTitle": "ஒன்றாக வாசி",
        "kids.verseText": "\"உலகத்தை மிகவும் நேசித்தபடி, தம்முடைய ஒப்புவிக்கப்பட்ட ஒரேகுமாரனை அளித்தார், அவரை விசுவாசிக்கிறவன் எவனோ அவன் கெட்டுப்போகாமல் நித்தியஜீவனை அடைவான்.\" — யோவான் 3:16 (KJV, ஆங்கிலம். தமிழ் வசனம்: வேத வாசிப்பு பிரிவிற்குச் சென்று BSI-யைப் படிக்கவும்).",
        "userAchievements.lead": "வேதாகமக் கேள்விகள் மற்றும் வேத வாசிப்பு புள்ளிகள். ஒவ்வொரு உறுப்பினரும் உள்நுழைந்து செயலியை திறந்த பிறகே பட்டியலில் தோன்றுவர் (ஒவ்வொரு சாதனமும் ஒரு மேக வரியை வெளியிடும்). மீண்டும் ஏற்று என தட்டவும்.",
        "userAchievements.loginHint": "பட்டியலில் தோன்ற உள்நுழையவும்; உங்கள் பெயர் சுயவிவரத்திலிருந்து எடுக்கப்படும்.",
        "userAchievements.refresh": "மீண்டும் ஏற்று",
        "userAchievements.loading": "புள்ளிகள் ஏற்றப்படுகின்றன…",
        "userAchievements.empty": "இன்னும் புள்ளிகள் இல்லை. வேதாகமக் கேள்விகளில் பங்கேற்று வேத வாசிப்பை முடிக்கவும்.",
        "userAchievements.error": "பட்டியலை ஏற்ற முடியவில்லை. மீண்டும் முயற்சிக்கவும்.",
        "userAchievements.errorRules": "பட்டியலை ஏற்ற முடியவில்லை: Firestore இந்த வாசிப்பை தடுத்தது. செயலியின் firestore.rules விதிகளை இந்த Firebase திட்டத்தில் வெளியிடவும் (userAchievementScores-க்கு பொது வாசிப்பு), அல்லது நிர்வாகியை தொடர்பு கொள்ளவும்.",
        "userAchievements.colRank": "#",
        "userAchievements.colName": "பெயர்",
        "userAchievements.colTrivia": "வேதாகமக் கேள்விகள்",
        "userAchievements.colReading": "வாசிப்பு",
        "userAchievements.colTotal": "மொத்தம்",
        "userAchievements.colUpdatedHint": "ஒத்திசைவு",
        "userAchievements.updatedJustNow": "இப்போது",
        "userAchievements.updatedMinutes": "{n} நிமி முன்",
        "userAchievements.updatedHours": "{n} மணி முன்",
        "userAchievements.updatedDays": "{n} நாள் முன்",
        "userAchievements.emptyLong": "இன்னும் பட்டியல் காலியாக உள்ளது. உறுப்பினர்கள் உள்நுழைந்து செயலியை ஒருமுறை திறக்க வேண்டும்; பின் மீண்டும் ஏற்று என தட்டவும்.",
        "userAchievements.groupSummary": "உங்கள் குழு \"{tag}\": {count} பேர் · மொத்தம் {pts} புள்ளிகள்",
        "userAchievements.youLabel": "நீங்கள்",
        "userAchievements.youPinned": "நீங்கள்",
        "chat.eyebrow": "சமூகம்",
        "chat.title": "அரட்டை",
        "chat.subtitle": "உரை செய்திகள் மட்டும் — உள்நுழைந்த உறுப்பினர்கள். அன்புடனும் மரியாதையுடனும் பேசுங்கள்.",
        "chat.loginRequired": "செய்திகளை படிக்கவும் அனுப்பவும் முதலில் உள்நுழையவும்.",
        "chat.empty": "இன்னும் செய்திகள் இல்லை. வணக்கம் சொல்லுங்கள்!",
        "chat.inputPlaceholder": "செய்தியை தட்டச்சு செய்யவும்…",
        "chat.send": "அனுப்பு",
        "chat.loadError": "செய்திகளை ஏற்ற முடியவில்லை. Firestore விதிகளை சரிபார்க்கவும்.",
        "chat.sendFailed": "அனுப்ப முடியவில்லை. இணைப்பு மற்றும் விதிகளை சரிபார்க்கவும்.",
        "chat.textTooLong": "செய்தி மிக நீளமாக உள்ளது.",
        "chat.queuedOffline": "இணையம் இல்லை — செய்தி வரிசையில். இணைக்கும்போது அனுப்பப்படும்.",
        "chat.sendingQueued": "வரிசையிலுள்ள செய்திகளை அனுப்புகிறது…",
        "chat.pendingHint": "இணையம் வந்ததும் அனுப்பப்படும்",
        "chat.legacyImage": "[புகைப்படம் — பட பகிர்வு அணைக்கப்பட்டுள்ளது.]",
        "profile.groupId": "சிறு குழு / அணி குறியீடு (விருப்பம்)",
        "profile.groupIdHelp": "ஒரே குறியீடு = பயனர் சாதனைகளில் ஒருங்கிணைந்த புள்ளிகள்.",
        "profile.leaderboardAnonymous": "பொது பட்டியலில் \"Anonymous\" என காட்டு",
        "profile.photoSkipCloud": "புகைப்படத்தை இந்த சாதனத்தில் மட்டும் வை (மேகத்தில் ஏற்ற வேண்டாம்)",
        "profile.exportData": "என் தரவை பதிவிறக்கு (JSON)",
        "profile.badgesTitle": "பதக்கங்கள்",
        "profile.badgesEmpty": "பதக்கங்களுக்கு வாசிப்பு மற்றும் வேதாகமக் கேள்விகளை தொடரவும்.",
        "profile.badgeReader10": "அர்ப்பணிப்புள்ள வாசகர் (10+ வாசிப்பு)",
        "profile.badgeTrivia10": "வேதாகமக் கேள்வி வீரர் (10+ புள்ளிகள்)",
        "profile.badgeAllStar": "அனைத்து நட்சத்திரம் (25+ மொத்தம்)",
        "app.offlineBanner": "இணையம் இல்லை — சேமித்த உள்ளடக்கம் காட்டப்படுகிறது.",
        "app.installBannerRegionAria": "செயலியை நிறுவு",
        "app.installBannerTitle": "NJC செயலியை நிறுவவும்",
        "app.installBannerBody": "விரைவான அணுகல் மற்றும் இணையம் இல்லாத பயன்பாட்டிற்கு முகப்புத் திரையில் சேர்க்கவும்.",
        "app.installBannerCta": "நிறுவு",
        "app.installBannerDismiss": "இப்போது வேண்டாம்",
        "app.installBannerIos": "iPhone/iPad: பகிர் ஐகானைத் தட்டி \"Add to Home Screen\" தேர்ந்தெடுக்கவும்.",
        "app.installBannerAndroid": "Android Chrome: மெனு (⋮) ஐ தட்டி \"Install app\" அல்லது \"Add to Home screen\" தேர்ந்தெடுக்கவும்.",
        "app.updateSnooze24h": "24 மணி நேரத்தில் நினைவூட்டு",
        "app.updateLater": "இப்போது வேண்டாம் (இந்த அமர்வு)",
        "app.updateNotesPrefix": "புதியவை:",
        "home.readingStreakDays": "தொடர்ச்சியான {count} நாள் வாசிப்பு (பிரஸ்ஸெல்ஸ் நாட்கள்)",
        "home.readingNudgeMorning": "இன்றைய காலை வாசிப்பை மறக்க வேண்டாம்.",
        "home.readingNudgeEvening": "இன்றைய மாலை வாசிப்பை மறக்க வேண்டாம்.",
        "home.readingShareProgress": "முன்னேற்றத்தை பகிர்",
        "home.readingHeatmapToggle": "இந்த மாதம்",
        "home.readingHeatmapTitle": "இந்த மாத வாசிப்பு (அடர் = அதிகம்)",
        "home.readingShareLine": "என் வேத வாசிப்பு திட்டம்: {done}/{total} நாட்கள் ({pct}%) — NJC செயலி",
        "home.announcementDismiss": "படித்ததாக குறி",
        "admin.leaderboardPreviewTitle": "பயனர் சாதனைகள் முன்னோட்டம்",
        "admin.leaderboardPreviewInfo": "Firestore பொது பட்டியல் (செயலி பட்டியல் போல).",
        "admin.leaderboardPreviewRefresh": "பட்டியலை ஏற்று",
        "admin.leaderboardLoading": "ஏற்றுகிறது…",
        "admin.leaderboardLoaded": "{n} வரிகள்",
        "admin.leaderboardEmpty": "இன்னும் வரிகள் இல்லை.",
        "admin.leaderboardError": "ஏற்ற முடியவில்லை (Firestore விதிகளை சரிபார்க்கவும்).",
        "admin.leaderboardNeedLogin": "இந்த உலாவியில் Firebase உடன் உள்நுழையவும்.",
        "admin.triviaInsightsTitle": "பயனர் வாரியாக வேதாகமக் கேள்விகள் & செயல்பாடு",
        "admin.triviaInsightsInfo": "உள்நுழைந்த பயனர்கள் மட்டும். வேதாகமக் கேள்விகளை விளையாடும்போது ஒத்திசைகிறது. “ஆன்லைன்” = கடைசி 3 நிமிடத்தில் செயலி திறந்திருந்தது.",
        "admin.triviaInsightsRefresh": "பயனர் புள்ளிவிவரம் ஏற்று",
        "admin.triviaInsightsLoaded": "{n} பயனர்கள்",
        "admin.triviaInsightsEmpty": "இன்னும் தரவு இல்லை. பயனர்கள் உள்நுழைந்து செயலியை திறந்த பிறகு தோன்றும்.",
        "admin.triviaInsightsError": "ஏற்ற முடியவில்லை. Firestore விதிகளை வெளியிடவும் (நிர்வாகி மின்னஞ்சல் + adminTriviaReports).",
        "admin.triviaInsightsRulesHint": "வேதாகமக் கேள்வி நெடுவரிசைகளுக்கு புதிய Firestore விதிகள் தேவை: adminTriviaReports-க்கு நிர்வாகி வாசிப்பை வெளியிட்டு மீண்டும் ஏற்றவும்.",
        "admin.triviaInsightsColUser": "பயனர்",
        "admin.triviaInsightsColStatus": "நிலை",
        "admin.triviaInsightsColCorrect": "சரி",
        "admin.triviaInsightsColWrong": "தவறு",
        "admin.triviaInsightsColLast": "கடைசி வேதாகமக் கேள்வி",
        "admin.triviaInsightsColDetail": "தேதி வாரியாக",
        "admin.triviaInsightsOnline": "ஆன்லைன்",
        "admin.triviaInsightsJustNow": "இப்போது",
        "admin.triviaInsightsAgo": "முன்",
        "admin.triviaInsightsDays": "நாட்கள்",
        "admin.scheduleHintsTitle": "உள்ளடக்க அட்டவணை குறிப்புகள்",
        "admin.scheduleHintTrivia": "வேதாகமக் கேள்விகள்: காட்டு தேதியை அமைத்தால் அன்று பெல்ஜியம் நேர நள்ளிரவு முதல் புதிய கேள்வி.",
        "admin.scheduleHintEvents": "நிகழ்வுகள்: தேதிகள் இங்கு சேர்க்கப்பட்டால் முகப்பு மற்றும் நிகழ்வுகள் தாவலில் தோன்றும்.",
        "admin.scheduleHintNotices": "அறிவிப்புகள்: MantleDB-க்கு வெளியிடவும்; நிலையான பட்டியலுடன் இணைகின்றன.",
        "admin.noticeLinkPresets": "செயலி இணைப்பு முன்னமைவுகள்",
        "admin.linkPresetsTitle": "செயலி இணைப்பை சேர்",
        "admin.linkPresetsInfo": "புலத்தை நிரப்ப ஒரு பாதையை தட்டவும்.",
        "admin.linkPresetsClose": "மூடு",
        "settings.close": "மூடு"
    };

    function isSameOriginHttp(url) {
        return (url.protocol === "http:" || url.protocol === "https:") && url.origin === window.location.origin;
    }

    function getStoredLanguage() {
        try {
            var value = window.localStorage.getItem(LANGUAGE_KEY);
            if (value === "en" || value === "ta") {
                return value;
            }
        } catch (err) {
            return null;
        }
        return null;
    }

    function getActiveLanguage() {
        return getStoredLanguage() || "en";
    }

    function getLocale() {
        return activeLanguage === "ta" ? "ta-IN" : "en-GB";
    }

    function getLocaleFromLanguage(language) {
        return language === "ta" ? "ta-IN" : "en-GB";
    }

    function translateWithLanguage(language, key, fallback) {
        if (language === "ta" && Object.prototype.hasOwnProperty.call(tamilTranslations, key)) {
            return tamilTranslations[key];
        }
        if (fallback !== undefined && fallback !== null && String(fallback).length) {
            return fallback;
        }
        return key;
    }

    function t(key, fallback) {
        return translateWithLanguage(activeLanguage, key, fallback);
    }

    function escapeHtml(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    var FONT_PRESETS_EN = {
        inter: { stack: '"Inter", "Segoe UI", system-ui, sans-serif', googleFamily: "Inter:wght@400;600;700" },
        dm: { stack: '"DM Sans", system-ui, sans-serif', googleFamily: "DM Sans:wght@400;600;700" },
        source: { stack: '"Source Sans 3", "Segoe UI", system-ui, sans-serif', googleFamily: "Source Sans 3:wght@400;600;700" },
        open: { stack: '"Open Sans", "Segoe UI", system-ui, sans-serif', googleFamily: "Open Sans:wght@400;600;700" },
        lato: { stack: '"Lato", "Segoe UI", system-ui, sans-serif', googleFamily: "Lato:wght@400;700" },
        system: { stack: 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif', googleFamily: "" }
    };

    var FONT_PRESETS_TA = {
        noto: { stack: '"Noto Sans Tamil", "Latha", "Tamil MN", "Nirmala UI", system-ui, sans-serif', googleFamily: "Noto Sans Tamil:wght@400;600;700" },
        mukta: { stack: '"Mukta Malar", "Noto Sans Tamil", "Latha", sans-serif', googleFamily: "Mukta Malar:wght@400;600;700" },
        hind: { stack: '"Hind Madurai", "Noto Sans Tamil", sans-serif', googleFamily: "Hind Madurai:wght@400;600;700" },
        catamaran: { stack: '"Catamaran", "Noto Sans Tamil", sans-serif', googleFamily: "Catamaran:wght@400;600;700" },
        system: { stack: '"Latha", "Nirmala UI", "Tamil Sangam MN", "Noto Sans Tamil", system-ui, sans-serif', googleFamily: "" }
    };

    var loadedGoogleFontIds = {};

    function normalizeFontPreset(map, key, fallbackKey) {
        var k = String(key || "").trim().toLowerCase();
        if (map[k]) {
            return k;
        }
        return fallbackKey;
    }

    function getStoredFontEn() {
        try {
            var raw = String(window.localStorage.getItem(FONT_EN_KEY) || "").trim().toLowerCase();
            if (FONT_PRESETS_EN[raw]) {
                return raw;
            }
        } catch (e) {}
        return "inter";
    }

    function getStoredFontTa() {
        try {
            var raw = String(window.localStorage.getItem(FONT_TA_KEY) || "").trim().toLowerCase();
            if (FONT_PRESETS_TA[raw]) {
                return raw;
            }
        } catch (e) {}
        return "noto";
    }

    function persistFontEn(key) {
        try {
            window.localStorage.setItem(FONT_EN_KEY, key);
        } catch (e) {}
    }

    function persistFontTa(key) {
        try {
            window.localStorage.setItem(FONT_TA_KEY, key);
        } catch (e) {}
    }

    function getFontPanelOpenStored() {
        try {
            return window.localStorage.getItem(FONT_PANEL_OPEN_KEY) === "1";
        } catch (e) {
            return false;
        }
    }

    function persistFontPanelOpen(open) {
        try {
            window.localStorage.setItem(FONT_PANEL_OPEN_KEY, open ? "1" : "0");
        } catch (e) {}
    }

    function loadGoogleFontFamilies(familyParams) {
        var list = (familyParams || []).filter(Boolean);
        if (!list.length) {
            return;
        }
        var idKey = list.join("|");
        if (loadedGoogleFontIds[idKey]) {
            return;
        }
        var qs = list.map(function (p) {
            return "family=" + String(p).replace(/ /g, "+");
        }).join("&");
        var href = "https://fonts.googleapis.com/css2?" + qs + "&display=swap";
        var link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = href;
        link.setAttribute("data-njc-fonts", "1");
        document.head.appendChild(link);
        loadedGoogleFontIds[idKey] = true;
    }

    function applyFontVariables(enKey, taKey) {
        var en = FONT_PRESETS_EN[enKey] || FONT_PRESETS_EN.inter;
        var ta = FONT_PRESETS_TA[taKey] || FONT_PRESETS_TA.noto;
        var root = document.documentElement;
        root.style.setProperty("--font-stack-en", en.stack);
        root.style.setProperty("--font-stack-ta", ta.stack);
        loadGoogleFontFamilies([en.googleFamily, ta.googleFamily].filter(Boolean));
    }

    function translateCountText(template, count) {
        return String(template).replace("{count}", String(count));
    }

    function applyTranslations(root, forcedLanguage) {
        var scope = root || document;
        var language = forcedLanguage === "ta" ? "ta" : (forcedLanguage === "en" ? "en" : activeLanguage);

        scope.querySelectorAll("[data-i18n]").forEach(function (node) {
            var key = node.getAttribute("data-i18n");
            if (!node.hasAttribute("data-i18n-fallback")) {
                node.setAttribute("data-i18n-fallback", node.textContent);
            }
            var fallback = node.getAttribute("data-i18n-fallback") || "";
            node.textContent = translateWithLanguage(language, key, fallback);
        });

        scope.querySelectorAll("[data-i18n-aria-label]").forEach(function (node) {
            var key = node.getAttribute("data-i18n-aria-label");
            if (!node.hasAttribute("data-i18n-aria-fallback")) {
                node.setAttribute("data-i18n-aria-fallback", node.getAttribute("aria-label") || "");
            }
            var fallback = node.getAttribute("data-i18n-aria-fallback") || "";
            node.setAttribute("aria-label", translateWithLanguage(language, key, fallback));
        });

        scope.querySelectorAll("[data-i18n-title]").forEach(function (node) {
            var key = node.getAttribute("data-i18n-title");
            if (!node.hasAttribute("data-i18n-title-fallback")) {
                node.setAttribute("data-i18n-title-fallback", node.getAttribute("title") || "");
            }
            var fallback = node.getAttribute("data-i18n-title-fallback") || "";
            node.setAttribute("title", translateWithLanguage(language, key, fallback));
        });

        scope.querySelectorAll("[data-i18n-placeholder]").forEach(function (node) {
            var key = node.getAttribute("data-i18n-placeholder");
            if (!node.hasAttribute("data-i18n-placeholder-fallback")) {
                node.setAttribute("data-i18n-placeholder-fallback", node.getAttribute("placeholder") || "");
            }
            var fallback = node.getAttribute("data-i18n-placeholder-fallback") || "";
            node.setAttribute("placeholder", translateWithLanguage(language, key, fallback));
        });
    }

    function setLanguage(language, persist, shouldDispatch) {
        var next = (language === "ta") ? "ta" : "en";
        activeLanguage = next;
        document.documentElement.setAttribute("lang", next);
        applyTranslations(document);

        if (persist) {
            try {
                window.localStorage.setItem(LANGUAGE_KEY, next);
            } catch (err) {
                return null;
            }
        }

        if (shouldDispatch) {
            document.dispatchEvent(new CustomEvent("njc:langchange", {
                detail: {
                    language: next
                }
            }));
        }
        return null;
    }

    function ensureHeaderControls(header) {
        var controls = header.querySelector(".header-controls");
        if (controls) {
            return controls;
        }
        controls = document.createElement("div");
        controls.className = "header-controls";
        header.appendChild(controls);
        return controls;
    }

    function getStoredCardLanguageMap() {
        try {
            var raw = window.localStorage.getItem(CARD_LANGUAGE_MAP_KEY);
            var parsed = raw ? JSON.parse(raw) : {};
            return parsed && typeof parsed === "object" ? parsed : {};
        } catch (err) {
            return {};
        }
    }

    function normalizeCardLanguageChoice(choice) {
        if (choice === "en" || choice === "ta") {
            return choice;
        }
        return "";
    }

    function saveCardLanguageMap(map) {
        var source = map && typeof map === "object" ? map : {};
        var keys = Object.keys(source).slice(0, 120);
        var next = {};
        keys.forEach(function (key) {
            var normalized = normalizeCardLanguageChoice(source[key]);
            if (normalized === "en" || normalized === "ta") {
                next[key] = normalized;
            }
        });
        try {
            window.localStorage.setItem(CARD_LANGUAGE_MAP_KEY, JSON.stringify(next));
        } catch (err) {
            return null;
        }
        return next;
    }

    function getCardLanguageChoice(cardId, languageMap) {
        if (!cardId) {
            return activeLanguage;
        }
        var map = languageMap && typeof languageMap === "object" ? languageMap : getStoredCardLanguageMap();
        var stored = normalizeCardLanguageChoice(map[cardId]);
        return stored || activeLanguage;
    }

    function getCardEffectiveLanguage(cardId, languageMap) {
        return getCardLanguageChoice(cardId, languageMap);
    }

    function getLanguageForElement(element) {
        if (!element || typeof element.closest !== "function") {
            return activeLanguage;
        }
        var card = element.closest(".card");
        if (!card) {
            return activeLanguage;
        }
        var cardId = String(card.getAttribute("data-card-lang-id") || "").trim();
        return getCardLanguageChoice(cardId);
    }

    function getLocaleForElement(element) {
        return getLocaleFromLanguage(getLanguageForElement(element));
    }

    function tForElement(element, key, fallback) {
        return translateWithLanguage(getLanguageForElement(element), key, fallback);
    }

    function setupCardLanguageSwitchers() {
        var cards = Array.prototype.slice.call(document.querySelectorAll(".page-view .card"));
        if (!cards.length) {
            return;
        }
        var cardLanguageMap = getStoredCardLanguageMap();

        function getCardId(card, index) {
            var existing = String(card.getAttribute("data-card-lang-id") || "").trim();
            if (existing) {
                return existing;
            }
            var route = "global";
            var pageView = card.closest(".page-view");
            if (pageView) {
                route = String(pageView.getAttribute("data-route") || "global").trim().toLowerCase() || "global";
            }
            var generated = "card-" + route + "-" + String(index + 1);
            card.setAttribute("data-card-lang-id", generated);
            return generated;
        }

        function refreshCardToggleUi(button, choice) {
            if (!button) {
                return;
            }
            var nextLanguage = choice === "ta" ? "en" : "ta";
            button.textContent = nextLanguage.toUpperCase();
            var label = nextLanguage === "ta"
                ? t("toggle.language.toTamil", "Switch language to Tamil")
                : t("toggle.language.toEnglish", "Switch language to English");
            button.setAttribute("aria-label", label);
            button.title = label;
        }

        function applyCardLanguage(card) {
            if (!card) {
                return;
            }
            var cardId = String(card.getAttribute("data-card-lang-id") || "").trim();
            if (!cardId) {
                return;
            }
            var choice = getCardLanguageChoice(cardId, cardLanguageMap);
            var effectiveLanguage = getCardEffectiveLanguage(cardId, cardLanguageMap);
            applyTranslations(card, effectiveLanguage);
            var toggle = card.querySelector(".card-lang-toggle");
            refreshCardToggleUi(toggle, choice);
        }

        function buildCardSwitcher(card, index) {
            if (!card || card.tagName === "A") {
                return;
            }
            var cardId = getCardId(card, index);
            if (card.querySelector(".card-lang-toggle")) {
                applyCardLanguage(card);
                return;
            }
            var toggle = document.createElement("button");
            toggle.type = "button";
            toggle.className = "mini-toggle card-lang-toggle";
            toggle.setAttribute("data-card-lang-id", cardId);
            toggle.setAttribute("aria-pressed", "false");
            toggle.addEventListener("click", function () {
                var current = getCardLanguageChoice(cardId, cardLanguageMap);
                var nextChoice = current === "ta" ? "en" : "ta";
                cardLanguageMap[cardId] = nextChoice;
                cardLanguageMap = saveCardLanguageMap(cardLanguageMap) || cardLanguageMap;
                applyCardLanguage(card);
                document.dispatchEvent(new CustomEvent("njc:cardlangchange", {
                    detail: {
                        cardId: cardId,
                        language: nextChoice
                    }
                }));
            });

            card.classList.add("card-has-lang-switch");
            var titleNode = card.firstElementChild && card.firstElementChild.tagName === "H2"
                ? card.firstElementChild
                : null;
            if (titleNode) {
                var topRow = document.createElement("div");
                topRow.className = "card-lang-top";
                titleNode.insertAdjacentElement("beforebegin", topRow);
                topRow.appendChild(titleNode);
                topRow.appendChild(toggle);
            } else {
                card.insertAdjacentElement("afterbegin", toggle);
            }
            applyCardLanguage(card);
        }

        function refreshAllCardLanguages() {
            cards.forEach(function (card) {
                applyCardLanguage(card);
            });
        }

        cards.forEach(function (card, index) {
            buildCardSwitcher(card, index);
        });
        refreshAllCardLanguages();
        document.addEventListener("njc:langchange", function () {
            cards.forEach(function (card) {
                var toggle = card.querySelector(".card-lang-toggle");
                if (toggle) {
                    var cardId = String(card.getAttribute("data-card-lang-id") || "").trim();
                    refreshCardToggleUi(toggle, getCardLanguageChoice(cardId, cardLanguageMap));
                }
            });
            refreshAllCardLanguages();
        });
    }

    function getCurrentRouteId() {
        var raw = String(window.location.hash || "").replace(/^#/, "").trim();
        var path = raw;
        var q = path.indexOf("?");
        if (q >= 0) {
            path = path.slice(0, q);
        }
        var first = path.split("/").map(function (s) { return s.trim(); }).filter(Boolean)[0] || "";
        return (first || "home").toLowerCase();
    }

    function setupHomeGlobalLanguageFab() {
        var fab = document.getElementById("home-global-lang-fab");
        if (!fab) {
            fab = document.createElement("button");
            fab.id = "home-global-lang-fab";
            fab.type = "button";
            fab.className = "home-global-lang-fab home-global-fab";
            fab.setAttribute("aria-hidden", "true");
            fab.innerHTML = "<i class=\"fa-solid fa-language\" aria-hidden=\"true\"></i>";
            document.body.appendChild(fab);
        }

        function refreshFabUi() {
            var next = activeLanguage === "ta" ? "en" : "ta";
            var label = next === "ta"
                ? t("toggle.language.toTamil", "Switch language to Tamil")
                : t("toggle.language.toEnglish", "Switch language to English");
            fab.setAttribute("aria-label", label);
            fab.title = label;
        }

        function syncFabVisibility() {
            var hide = document.body.classList.contains("header-menu-open")
                || document.body.classList.contains("auth-entry-open")
                || document.body.classList.contains("auth-modal-open")
                || document.body.classList.contains("bible-fullscreen-open")
                || document.body.classList.contains("songbook-fullscreen-open")
                || document.body.classList.contains("sermon-player-open")
                || document.body.classList.contains("prayer-detail-open")
                || document.body.classList.contains("app-update-open")
                || document.body.classList.contains("splash-active");
            fab.hidden = hide;
            fab.setAttribute("aria-hidden", hide ? "true" : "false");
            if (!hide) {
                refreshFabUi();
            }
        }

        fab.addEventListener("click", function () {
            var next = activeLanguage === "ta" ? "en" : "ta";
            setLanguage(next, true, true);
        });

        document.addEventListener("njc:langchange", function () {
            refreshFabUi();
        });
        document.addEventListener("njc:routechange", syncFabVisibility);
        window.addEventListener("hashchange", syncFabVisibility);
        if (typeof MutationObserver !== "undefined") {
            var fabObserver = new MutationObserver(syncFabVisibility);
            fabObserver.observe(document.body, { attributes: true, attributeFilter: ["class"] });
        }
        syncFabVisibility();
    }

    function setupHomeGlobalThemeFab() {
        var fab = document.getElementById("home-global-theme-fab");
        if (!fab) {
            fab = document.createElement("button");
            fab.id = "home-global-theme-fab";
            fab.type = "button";
            fab.className = "home-global-theme-fab home-global-fab";
            fab.setAttribute("aria-hidden", "true");
            document.body.appendChild(fab);
        }

        function refreshThemeFabUi() {
            var theme = document.documentElement.getAttribute("data-theme") || getActiveTheme();
            setToggleIcon(fab, theme);
        }

        function syncFabVisibility() {
            var hide = document.body.classList.contains("header-menu-open")
                || document.body.classList.contains("auth-entry-open")
                || document.body.classList.contains("auth-modal-open")
                || document.body.classList.contains("bible-fullscreen-open")
                || document.body.classList.contains("songbook-fullscreen-open")
                || document.body.classList.contains("sermon-player-open")
                || document.body.classList.contains("prayer-detail-open")
                || document.body.classList.contains("app-update-open")
                || document.body.classList.contains("splash-active");
            fab.hidden = hide;
            fab.setAttribute("aria-hidden", hide ? "true" : "false");
            if (!hide) {
                refreshThemeFabUi();
            }
        }

        fab.addEventListener("click", function () {
            var nextTheme = (document.documentElement.getAttribute("data-theme") === "dark") ? "light" : "dark";
            applyTheme(nextTheme);
            persistTheme(nextTheme);
            refreshThemeFabUi();
            document.dispatchEvent(new CustomEvent("njc:themechange", { detail: { theme: nextTheme } }));
        });

        document.addEventListener("njc:themechange", function () {
            refreshThemeFabUi();
        });
        document.addEventListener("njc:langchange", function () {
            refreshThemeFabUi();
        });
        document.addEventListener("njc:routechange", syncFabVisibility);
        window.addEventListener("hashchange", syncFabVisibility);
        if (typeof MutationObserver !== "undefined") {
            var themeFabObserver = new MutationObserver(syncFabVisibility);
            themeFabObserver.observe(document.body, { attributes: true, attributeFilter: ["class"] });
        }
        syncFabVisibility();
    }

    function isNavigableAnchor(anchor) {
        if (!anchor) {
            return false;
        }

        var rawHref = anchor.getAttribute("href");
        if (!rawHref || rawHref === "#" || rawHref.startsWith("#")) {
            return false;
        }

        if (anchor.target && anchor.target !== "_self") {
            return false;
        }

        if (anchor.hasAttribute("download")) {
            return false;
        }

        var url = new URL(anchor.href, window.location.href);
        if (!isSameOriginHttp(url)) {
            return false;
        }

        var current = new URL(window.location.href);
        if (url.pathname === current.pathname && url.search === current.search && url.hash === current.hash) {
            return false;
        }

        return true;
    }

    function prefetchUrl(url) {
        var key = url.href;
        if (prefetched.has(key)) {
            return;
        }
        prefetched.add(key);

        var prefetchLink = document.createElement("link");
        prefetchLink.rel = "prefetch";
        prefetchLink.href = key;
        document.head.appendChild(prefetchLink);

        if (window.fetch) {
            fetch(key, { credentials: "same-origin" }).catch(function () {
                return null;
            });
        }
    }

    function prefetchFromAnchor(anchor) {
        if (!isNavigableAnchor(anchor)) {
            return;
        }
        prefetchUrl(new URL(anchor.href, window.location.href));
    }

    function setupTabPrefetch() {
        var tabLinks = document.querySelectorAll(".tab-nav a.tab[href]");
        tabLinks.forEach(function (link) {
            prefetchFromAnchor(link);
        });
    }

    function setupIntentPrefetch() {
        document.addEventListener("mouseover", function (event) {
            var anchor = event.target.closest("a[href]");
            if (anchor) {
                prefetchFromAnchor(anchor);
            }
        });

        document.addEventListener("touchstart", function (event) {
            var anchor = event.target.closest("a[href]");
            if (anchor) {
                prefetchFromAnchor(anchor);
            }
        }, { passive: true });
    }

    var SW_VERSION = "20260411kidsnochoice1";
    var APP_VERSION = "2026.4.11";
    /** Fallback if the waiting worker is too old to send release notes. */
    var UPDATE_NOTES_FALLBACK = "Bug fixes and improvements.";

    /** Dismiss/snooze tied to service worker APP_CACHE id (not script URL query). */
    var UPDATE_DISMISS_BUILD_KEY = "njc_update_dismissed_app_cache_v1";
    var SESSION_UPDATE_MODAL_AUTO_KEY = "njc_update_modal_auto_shown_v1";
    var updateModalAutoInFlight = false;
    var lastVisibilitySwUpdateAt = 0;
    var VISIBILITY_SW_UPDATE_MIN_MS = 2 * 60 * 1000;

    function getUpdateSnoozeUntilMs() {
        try {
            var raw = window.localStorage.getItem("njc_update_snooze_until_v1");
            var n = Number(raw);
            return isNaN(n) ? 0 : n;
        } catch (e) {
            return 0;
        }
    }

    function isUpdateSnoozeActive() {
        return Date.now() < getUpdateSnoozeUntilMs();
    }

    function getWaitingWorkerUpdateMeta(registration) {
        if (!registration || !registration.waiting) {
            return Promise.resolve({ version: "", releaseNotes: "" });
        }
        return new Promise(function (resolve) {
            var settled = false;
            function done(value) {
                if (settled) {
                    return;
                }
                settled = true;
                resolve(value || { version: "", releaseNotes: "" });
            }
            var timer = window.setTimeout(function () {
                done({ version: "", releaseNotes: "" });
            }, 2500);
            try {
                var channel = new MessageChannel();
                channel.port1.onmessage = function (ev) {
                    window.clearTimeout(timer);
                    var d = ev && ev.data;
                    var v = d && d.version;
                    var notes = d && d.releaseNotes;
                    done({
                        version: typeof v === "string" ? v : "",
                        releaseNotes: typeof notes === "string" ? notes.trim() : ""
                    });
                };
                registration.waiting.postMessage({ type: "GET_APP_CACHE_VERSION" }, [channel.port2]);
            } catch (e2) {
                window.clearTimeout(timer);
                done({ version: "", releaseNotes: "" });
            }
        });
    }

    function isUpdateDismissedForBuild(buildId) {
        if (!buildId) {
            return false;
        }
        try {
            return window.localStorage.getItem(UPDATE_DISMISS_BUILD_KEY) === buildId;
        } catch (e3) {
            return false;
        }
    }

    function rememberUpdateDismissedForBuild(buildId) {
        if (!buildId) {
            return;
        }
        try {
            window.localStorage.setItem(UPDATE_DISMISS_BUILD_KEY, buildId);
        } catch (e4) {}
    }

    function clearStoredUpdateDismissIfIdle(registration) {
        if (registration && registration.waiting) {
            return;
        }
        try {
            window.localStorage.removeItem(UPDATE_DISMISS_BUILD_KEY);
        } catch (e5) {}
    }

    function hasAutoUpdateModalBeenShownThisSession() {
        try {
            return window.sessionStorage.getItem(SESSION_UPDATE_MODAL_AUTO_KEY) === "1";
        } catch (e6) {
            return false;
        }
    }

    function markAutoUpdateModalShownThisSession() {
        try {
            window.sessionStorage.setItem(SESSION_UPDATE_MODAL_AUTO_KEY, "1");
        } catch (e7) {}
    }

    function tryShowUpdateModal(registration, options) {
        var opts = options || {};
        var fromSettings = Boolean(opts.fromSettings);
        if (!registration || !registration.waiting) {
            return;
        }
        if (isUpdateSnoozeActive()) {
            return;
        }
        if (!fromSettings) {
            if (updateModalAutoInFlight) {
                return;
            }
            updateModalAutoInFlight = true;
        }
        getWaitingWorkerUpdateMeta(registration).then(function (meta) {
            var buildId = meta && meta.version ? meta.version : "";
            var releaseNotesFromWorker = meta && meta.releaseNotes ? meta.releaseNotes : "";

            function releaseAutoLock() {
                if (!fromSettings) {
                    updateModalAutoInFlight = false;
                }
            }
            if (!fromSettings) {
                if (buildId && isUpdateDismissedForBuild(buildId)) {
                    releaseAutoLock();
                    return;
                }
                if (hasAutoUpdateModalBeenShownThisSession()) {
                    releaseAutoLock();
                    return;
                }
                markAutoUpdateModalShownThisSession();
            }
            showUpdateModal(registration, {
                dismissedBuildId: buildId,
                releaseNotesFromWorker: releaseNotesFromWorker
            });
            releaseAutoLock();
        });
    }

    function setupOfflineBanner() {
        var banner = document.getElementById("offline-banner");
        if (!banner) {
            return;
        }
        function sync() {
            banner.hidden = navigator.onLine !== false;
        }
        sync();
        window.addEventListener("online", sync);
        window.addEventListener("offline", sync);
    }

    var PWA_INSTALL_DISMISS_KEY = "njc_pwa_install_banner_dismissed_v1";

    function isRunningAsInstalledPwa() {
        try {
            return Boolean(
                (window.matchMedia && (
                    window.matchMedia("(display-mode: standalone)").matches ||
                    window.matchMedia("(display-mode: fullscreen)").matches ||
                    window.matchMedia("(display-mode: minimal-ui)").matches
                )) ||
                window.navigator.standalone === true ||
                String(document.referrer || "").indexOf("android-app://") === 0
            );
        } catch (err) {
            return false;
        }
    }

    function setupPwaInstallBanner() {
        var banner = document.getElementById("pwa-install-banner");
        var cta = document.getElementById("pwa-install-cta");
        var dismissBtn = document.getElementById("pwa-install-dismiss");
        var iosHint = document.getElementById("pwa-install-ios-hint");
        var androidHint = document.getElementById("pwa-install-android-hint");
        if (!banner) {
            return;
        }
        if (isRunningAsInstalledPwa()) {
            return;
        }
        try {
            if (window.localStorage.getItem(PWA_INSTALL_DISMISS_KEY) === "1") {
                return;
            }
        } catch (err) {
            return;
        }

        var deferredPrompt = null;

        function hideBanner() {
            banner.hidden = true;
        }

        function isLikelyIos() {
            var ua = String(navigator.userAgent || "");
            if (/iPad|iPhone|iPod/.test(ua)) {
                return true;
            }
            try {
                if (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) {
                    return true;
                }
            } catch (e) {}
            return false;
        }

        function isLikelyAndroid() {
            return /Android/i.test(String(navigator.userAgent || ""));
        }

        function hideInstallHints() {
            if (iosHint) {
                iosHint.hidden = true;
            }
            if (androidHint) {
                androidHint.hidden = true;
            }
        }

        function showBannerForIosHint() {
            hideInstallHints();
            if (iosHint) {
                iosHint.hidden = false;
            }
            if (cta) {
                cta.hidden = true;
            }
            banner.hidden = false;
        }

        function showBannerForAndroidHint() {
            hideInstallHints();
            if (androidHint) {
                androidHint.hidden = false;
            }
            if (cta) {
                cta.hidden = true;
            }
            banner.hidden = false;
        }

        window.addEventListener("beforeinstallprompt", function (event) {
            event.preventDefault();
            deferredPrompt = event;
            try {
                if (window.localStorage.getItem(PWA_INSTALL_DISMISS_KEY) === "1") {
                    return;
                }
            } catch (e2) {
                return;
            }
            if (isRunningAsInstalledPwa()) {
                return;
            }
            hideInstallHints();
            if (cta) {
                cta.hidden = false;
            }
            banner.hidden = false;
        });

        window.setTimeout(function () {
            if (deferredPrompt) {
                return;
            }
            if (isRunningAsInstalledPwa()) {
                return;
            }
            try {
                if (window.localStorage.getItem(PWA_INSTALL_DISMISS_KEY) === "1") {
                    return;
                }
            } catch (e3) {
                return;
            }
            if (isLikelyIos()) {
                showBannerForIosHint();
                return;
            }
            if (isLikelyAndroid()) {
                showBannerForAndroidHint();
            }
        }, 800);

        if (dismissBtn) {
            dismissBtn.addEventListener("click", function () {
                try {
                    window.localStorage.setItem(PWA_INSTALL_DISMISS_KEY, "1");
                } catch (e4) {}
                hideBanner();
            });
        }

        if (cta) {
            cta.addEventListener("click", function () {
                if (!deferredPrompt) {
                    if (isLikelyIos() && iosHint) {
                        iosHint.hidden = false;
                        if (androidHint) {
                            androidHint.hidden = true;
                        }
                    }
                    if (isLikelyAndroid() && androidHint) {
                        androidHint.hidden = false;
                        if (iosHint) {
                            iosHint.hidden = true;
                        }
                    }
                    return;
                }
                deferredPrompt.prompt();
                var choice = deferredPrompt.userChoice;
                if (choice && typeof choice.then === "function") {
                    choice.then(function () {
                        deferredPrompt = null;
                        hideBanner();
                    }).catch(function () {
                        deferredPrompt = null;
                        hideBanner();
                    });
                } else {
                    deferredPrompt = null;
                    hideBanner();
                }
            });
        }
    }

    function registerServiceWorker() {
        if (!("serviceWorker" in navigator)) {
            return;
        }
        navigator.serviceWorker.register("service-worker.js?v=" + encodeURIComponent(SW_VERSION), { updateViaCache: "none" }).then(function (registration) {
            clearStoredUpdateDismissIfIdle(registration);
            ensureFcmPushRegistration();
            registration.update();
            if (registration.waiting) {
                tryShowUpdateModal(registration);
            }
            registration.addEventListener("updatefound", function () {
                var worker = registration.installing;
                if (!worker) {
                    return;
                }
                worker.addEventListener("statechange", function () {
                    if (worker.state === "installed" && navigator.serviceWorker.controller) {
                        tryShowUpdateModal(registration);
                    }
                });
            });
        }).catch(function () {
            return null;
        });
        navigator.serviceWorker.addEventListener("controllerchange", function () {
            hideUpdateModal();
            navigator.serviceWorker.getRegistration().then(function (r) {
                clearStoredUpdateDismissIfIdle(r);
            });
        });
        document.addEventListener("visibilitychange", function () {
            if (document.visibilityState !== "visible") {
                return;
            }
            var now = Date.now();
            if (now - lastVisibilitySwUpdateAt < VISIBILITY_SW_UPDATE_MIN_MS) {
                return;
            }
            lastVisibilitySwUpdateAt = now;
            navigator.serviceWorker.getRegistration().then(function (r) {
                if (r) {
                    r.update();
                }
            });
        });
    }

    function hideUpdateModal() {
        var overlay = document.getElementById("app-update-overlay");
        if (!overlay) {
            return;
        }
        overlay.hidden = true;
        document.body.classList.remove("app-update-open");
    }

    function showUpdateModal(registration, options) {
        var opts = options || {};
        var dismissedBuildId = opts.dismissedBuildId;
        var overlay = document.getElementById("app-update-overlay");
        var confirmBtn = document.getElementById("app-update-confirm");
        var dismissBtn = document.getElementById("app-update-dismiss");
        var snoozeBtn = document.getElementById("app-update-snooze");
        var notesEl = document.getElementById("app-update-notes");
        var backdrop = document.getElementById("app-update-backdrop");
        if (!overlay || !confirmBtn || !dismissBtn) {
            return;
        }
        if (isUpdateSnoozeActive()) {
            return;
        }
        if (!overlay.hidden) {
            return;
        }
        overlay.hidden = false;
        document.body.classList.add("app-update-open");

        if (notesEl) {
            var prefix = (window.NjcI18n && typeof window.NjcI18n.t === "function")
                ? window.NjcI18n.t("app.updateNotesPrefix", "What's new:")
                : "What's new:";
            function formatUpdateNotesLine(buildId, notesFromWorker) {
                var notes = String(notesFromWorker || "").trim();
                if (!notes) {
                    notes = UPDATE_NOTES_FALLBACK;
                }
                var ver = String(buildId || "").trim();
                return ver ? notes + " (" + ver + ")" : notes;
            }
            function applyNotesLine(buildId, workerNotes) {
                notesEl.textContent = prefix + " " + formatUpdateNotesLine(buildId, workerNotes);
                notesEl.hidden = false;
            }
            var workerNotesEarly = opts.releaseNotesFromWorker;
            if (dismissedBuildId || (workerNotesEarly && String(workerNotesEarly).trim())) {
                applyNotesLine(dismissedBuildId, workerNotesEarly);
            } else {
                getWaitingWorkerUpdateMeta(registration).then(function (m) {
                    applyNotesLine(m.version, m.releaseNotes);
                });
            }
        }

        function reloadForUpdate() {
            try {
                if (registration && registration.waiting) {
                    registration.waiting.postMessage({ type: "SKIP_WAITING" });
                }
            } catch (err) {
                return null;
            }
            window.location.reload();
        }

        function resolveDismissBuildId(cb) {
            if (dismissedBuildId) {
                cb(dismissedBuildId);
                return;
            }
            getWaitingWorkerUpdateMeta(registration).then(function (m) {
                cb((m && m.version) || "");
            });
        }

        function dismiss() {
            resolveDismissBuildId(function (id) {
                rememberUpdateDismissedForBuild(id);
            });
            hideUpdateModal();
        }

        function snooze24h() {
            try {
                window.localStorage.setItem("njc_update_snooze_until_v1", String(Date.now() + 86400000));
            } catch (e1) {
                return null;
            }
            resolveDismissBuildId(function (id) {
                rememberUpdateDismissedForBuild(id);
            });
            hideUpdateModal();
        }

        confirmBtn.onclick = function () {
            reloadForUpdate();
        };
        dismissBtn.onclick = dismiss;
        if (snoozeBtn) {
            snoozeBtn.onclick = snooze24h;
        }
        if (backdrop) {
            backdrop.onclick = dismiss;
        }
    }

    function notificationsSupported() {
        return ("Notification" in window) && ("serviceWorker" in navigator);
    }

    function normalizeReminderMinutes(value) {
        var num = Number(value);
        if (num === 15 || num === 30 || num === 60) {
            return num;
        }
        return 60;
    }

    function getNotificationSettings() {
        try {
            var raw = window.localStorage.getItem(NOTIFICATION_SETTINGS_KEY);
            if (!raw) {
                return { enabled: false, reminderMinutes: 60 };
            }
            var parsed = JSON.parse(raw);
            return {
                enabled: Boolean(parsed && parsed.enabled),
                reminderMinutes: normalizeReminderMinutes(parsed && parsed.reminderMinutes)
            };
        } catch (err) {
            return { enabled: false, reminderMinutes: 60 };
        }
    }

    function setNotificationSettings(settings) {
        try {
            window.localStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify({
                enabled: Boolean(settings && settings.enabled),
                reminderMinutes: normalizeReminderMinutes(settings && settings.reminderMinutes)
            }));
        } catch (err) {
            return null;
        }
        return null;
    }

    function getNotificationPermission() {
        if (!notificationsSupported()) {
            return "unsupported";
        }
        return Notification.permission;
    }

    function getNotificationStatus() {
        var supported = notificationsSupported();
        var permission = getNotificationPermission();
        var settings = getNotificationSettings();
        return {
            supported: supported,
            permission: permission,
            enabled: settings.enabled,
            reminderMinutes: settings.reminderMinutes
        };
    }

    function emitNotificationStatus() {
        document.dispatchEvent(new CustomEvent("njc:notificationstatus", {
            detail: getNotificationStatus()
        }));
    }

    function getNotifiedMap() {
        try {
            var raw = window.localStorage.getItem(NOTIFICATION_SENT_KEY);
            var parsed = raw ? JSON.parse(raw) : {};
            return parsed && typeof parsed === "object" ? parsed : {};
        } catch (err) {
            return {};
        }
    }

    function markAsNotified(key) {
        var map = getNotifiedMap();
        map[key] = Date.now();
        var entries = Object.keys(map).sort(function (a, b) {
            return map[b] - map[a];
        }).slice(0, 120);
        var next = {};
        entries.forEach(function (entryKey) {
            next[entryKey] = map[entryKey];
        });
        try {
            window.localStorage.setItem(NOTIFICATION_SENT_KEY, JSON.stringify(next));
        } catch (err) {
            return null;
        }
        return null;
    }

    function wasNotified(key) {
        var map = getNotifiedMap();
        return Boolean(map[key]);
    }

    function getInAppNotificationItems() {
        try {
            var raw = window.localStorage.getItem(INAPP_NOTIFICATION_KEY);
            var parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch (err) {
            return [];
        }
    }

    function saveInAppNotificationItems(items) {
        var normalized = Array.isArray(items) ? items.filter(Boolean) : [];
        normalized = normalized.sort(function (a, b) {
            return Number(b.createdAt || 0) - Number(a.createdAt || 0);
        }).slice(0, 80);
        try {
            window.localStorage.setItem(INAPP_NOTIFICATION_KEY, JSON.stringify(normalized));
        } catch (err) {
            return null;
        }
        document.dispatchEvent(new CustomEvent("njc:inapp-notifications-updated", {
            detail: {
                unreadCount: normalized.filter(function (item) { return !item.read; }).length
            }
        }));
        return null;
    }

    function getInAppUnreadCount() {
        return getInAppNotificationItems().filter(function (item) {
            return !item.read;
        }).length;
    }

    function addInAppNotification(item) {
        var source = item && typeof item === "object" ? item : {};
        var id = String(source.id || "").trim();
        if (!id) {
            return;
        }
        var current = getInAppNotificationItems();
        if (current.some(function (entry) { return entry.id === id; })) {
            return;
        }
        current.unshift({
            id: id,
            title: String(source.title || "").trim(),
            body: String(source.body || "").trim(),
            url: String(source.url || "#home").trim() || "#home",
            kind: String(source.kind || "generic"),
            createdAt: Number(source.createdAt || Date.now()),
            read: false
        });
        saveInAppNotificationItems(current);
    }

    function markInAppNotificationRead(id) {
        var current = getInAppNotificationItems();
        var changed = false;
        current.forEach(function (item) {
            if (item.id === id && !item.read) {
                item.read = true;
                changed = true;
            }
        });
        if (changed) {
            saveInAppNotificationItems(current);
        }
    }

    function markAllInAppNotificationsRead() {
        var current = getInAppNotificationItems();
        var changed = false;
        current.forEach(function (item) {
            if (!item.read) {
                item.read = true;
                changed = true;
            }
        });
        if (changed) {
            saveInAppNotificationItems(current);
        }
    }

    function clearReadInAppNotifications() {
        var current = getInAppNotificationItems();
        var next = current.filter(function (item) {
            return !item.read;
        });
        if (next.length !== current.length) {
            saveInAppNotificationItems(next);
        }
    }

    function showNotification(options) {
        var config = options || {};
        if (!notificationsSupported() || getNotificationPermission() !== "granted") {
            return Promise.resolve(false);
        }

        var payload = {
            body: config.body || "",
            tag: config.tag || "",
            icon: "logo.png",
            badge: "logo.png",
            data: {
                url: config.url || "index.html"
            }
        };

        return navigator.serviceWorker.getRegistration().then(function (registration) {
            if (registration && registration.showNotification) {
                return registration.showNotification(config.title || "NJC", payload).then(function () {
                    return true;
                });
            }
            var fallback = new Notification(config.title || "NJC", payload);
            fallback.onclick = function () {
                window.location.href = payload.data.url;
            };
            return true;
        }).catch(function () {
            return false;
        });
    }

    function getFcmVapidKey() {
        try {
            var w = window;
            var k = w && w.NJC_FCM_VAPID_KEY;
            return String(k || "").trim();
        } catch (err) {
            return "";
        }
    }

    function getStoredFcmToken() {
        try {
            var raw = window.localStorage.getItem(FCM_REG_STATE_KEY);
            var parsed = raw ? JSON.parse(raw) : {};
            return parsed && typeof parsed === "object" ? parsed : {};
        } catch (err) {
            return {};
        }
    }

    function setStoredFcmToken(token) {
        try {
            window.localStorage.setItem(FCM_REG_STATE_KEY, JSON.stringify({
                token: String(token || "").trim(),
                updatedAt: Date.now()
            }));
        } catch (err) {
            return null;
        }
        return null;
    }

    function clearStoredFcmToken() {
        try {
            window.localStorage.removeItem(FCM_REG_STATE_KEY);
        } catch (err) {
            return null;
        }
        return null;
    }

    function removeFcmTokenFromFirestore(token) {
        var fb = window.firebase;
        var auth = fb && fb.auth && fb.auth();
        var db = fb && fb.firestore && fb.firestore();
        var user = auth && auth.currentUser;
        var t = String(token || "").trim();
        if (!db || !user || !t) {
            return Promise.resolve();
        }
        return db.collection("fcmTokens").doc(user.uid).delete().catch(function () {
            return null;
        });
    }

    function saveFcmTokenToFirestore(token) {
        var fb = window.firebase;
        var auth = fb && fb.auth && fb.auth();
        var db = fb && fb.firestore && fb.firestore();
        var FieldValue = fb && fb.firestore && fb.firestore.FieldValue;
        var user = auth && auth.currentUser;
        var t = String(token || "").trim();
        if (!db || !user || !t || !FieldValue) {
            return Promise.resolve();
        }
        return db.collection("fcmTokens").doc(user.uid).set({
            token: t,
            updatedAt: FieldValue.serverTimestamp()
        }, { merge: true }).catch(function () {
            return null;
        });
    }

    function syncFcmTokenWithFirestore(token) {
        return saveFcmTokenToFirestore(token);
    }

    var fcmForegroundUnsub = null;

    function setupForegroundFcmListener() {
        var fb = window.firebase;
        if (!fb || !fb.messaging) {
            return;
        }
        if (typeof fcmForegroundUnsub === "function") {
            try {
                fcmForegroundUnsub();
            } catch (e1) {
                return null;
            }
            fcmForegroundUnsub = null;
        }
        try {
            var messaging = fb.messaging();
            fcmForegroundUnsub = messaging.onMessage(function (payload) {
                var note = (payload && payload.notification) || {};
                var data = (payload && payload.data) || {};
                var title = String(note.title || data.title || "NJC").trim() || "NJC";
                var body = String(note.body || data.body || "").trim();
                var url = String(data.url || "#home").trim() || "#home";
                var tag = String(data.tag || "fcm-foreground").trim().slice(0, 120) || "fcm-foreground";
                showNotification({
                    title: title,
                    body: body,
                    tag: tag,
                    url: url
                });
            });
        } catch (e2) {
            fcmForegroundUnsub = null;
        }
    }

    function ensureFcmPushRegistration() {
        var vapid = getFcmVapidKey();
        if (!vapid) {
            return Promise.resolve();
        }
        if (!notificationsSupported() || getNotificationPermission() !== "granted") {
            return Promise.resolve();
        }
        var settings = getNotificationSettings();
        if (!settings.enabled) {
            return Promise.resolve();
        }
        var fb = window.firebase;
        if (!fb || !fb.messaging) {
            return Promise.resolve();
        }
        return navigator.serviceWorker.getRegistration().then(function (registration) {
            if (!registration) {
                return null;
            }
            var messaging;
            try {
                messaging = fb.messaging();
                messaging.useServiceWorker(registration);
            } catch (e3) {
                return null;
            }
            setupForegroundFcmListener();
            return messaging.getToken({ vapidKey: vapid }).then(function (token) {
                var t = String(token || "").trim();
                if (!t) {
                    return null;
                }
                setStoredFcmToken(t);
                return syncFcmTokenWithFirestore(t);
            });
        }).catch(function () {
            return null;
        });
    }

    function teardownFcmPushRegistration() {
        var vapid = getFcmVapidKey();
        if (typeof fcmForegroundUnsub === "function") {
            try {
                fcmForegroundUnsub();
            } catch (e4) {
                return null;
            }
            fcmForegroundUnsub = null;
        }
        var state = getStoredFcmToken();
        var prev = String(state && state.token || "").trim();
        clearStoredFcmToken();
        if (!vapid || !prev) {
            return Promise.resolve();
        }
        var fb = window.firebase;
        if (!fb || !fb.messaging) {
            return removeFcmTokenFromFirestore(prev);
        }
        try {
            var messaging = fb.messaging();
            return messaging.deleteToken({ vapidKey: vapid }).catch(function () {
                return null;
            }).then(function () {
                return removeFcmTokenFromFirestore(prev);
            });
        } catch (e5) {
            return removeFcmTokenFromFirestore(prev);
        }
    }

    function isAdminUser() {
        if (!window.NjcAuth || typeof window.NjcAuth.getUser !== "function") {
            return false;
        }
        var activeUser = window.NjcAuth.getUser();
        var email = String(activeUser && activeUser.email || "").trim().toLowerCase();
        return email === ADMIN_EMAIL;
    }

    function getStoredProfileMap() {
        try {
            var raw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
            var parsed = raw ? JSON.parse(raw) : {};
            return parsed && typeof parsed === "object" ? parsed : {};
        } catch (err) {
            return {};
        }
    }

    function deriveNameFromEmail(email) {
        var raw = String(email || "").trim().toLowerCase();
        if (!raw || raw.indexOf("@") < 1) {
            return "";
        }
        return raw.split("@")[0].replace(/[._-]+/g, " ").trim();
    }

    function normalizeEmail(email) {
        return String(email || "").trim().toLowerCase();
    }

    function getProfileForUser(activeUser) {
        var uid = String(activeUser && activeUser.uid || "").trim();
        if (!uid) {
            return {};
        }
        var map = getStoredProfileMap();
        var profile = map[uid];
        return profile && typeof profile === "object" ? profile : {};
    }

    function getUserDisplayName(activeUser, profile) {
        var fromProfile = String(profile && profile.fullName || "").trim();
        if (fromProfile) {
            return fromProfile;
        }
        var fromAuth = String(activeUser && activeUser.displayName || "").trim();
        if (fromAuth) {
            return fromAuth;
        }
        var fromEmail = deriveNameFromEmail(activeUser && activeUser.email || "");
        if (fromEmail) {
            return fromEmail;
        }
        return "";
    }

    function getUserPhotoUrl(activeUser, profile) {
        var fromProfile = String(profile && profile.photoUrl || "").trim();
        if (fromProfile) {
            return fromProfile;
        }
        return String(activeUser && activeUser.photoURL || "").trim();
    }

    function getInitials(value) {
        var parts = String(value || "").trim().split(/\s+/).filter(Boolean);
        if (!parts.length) {
            return "U";
        }
        if (parts.length === 1) {
            return parts[0].slice(0, 2).toUpperCase();
        }
        return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    }

    function diffMinutesFromBrusselsNow(nowBrussels, eventItem) {
        var nowUtc = Date.UTC(nowBrussels.year, nowBrussels.month - 1, nowBrussels.day, nowBrussels.hour, nowBrussels.minute);
        var eventUtc = Date.UTC(eventItem.year, eventItem.month - 1, eventItem.day, eventItem.hour, eventItem.minute);
        return Math.round((eventUtc - nowUtc) / 60000);
    }

    function checkEventReminder() {
        if (!window.NjcEvents || typeof window.NjcEvents.mergeUpcomingEvents !== "function") {
            return Promise.resolve();
        }
        var settings = getNotificationSettings();
        return window.NjcEvents.mergeUpcomingEvents({ eventsUrl: EVENTS_FEED_URL, horizonDays: 2 })
            .then(function (result) {
                var nowBrussels = result.nowBrussels;
                var nextEvent = (result.events || []).find(function (item) {
                    return item.key >= nowBrussels.key;
                });

                if (!nextEvent) {
                    return null;
                }

                var mins = diffMinutesFromBrusselsNow(nowBrussels, nextEvent);
                var notifyKey = "event:" + String(nextEvent.key);
                if (mins < 0 || mins > settings.reminderMinutes || wasNotified(notifyKey)) {
                    return null;
                }

                var dateText = window.NjcEvents.toDisplayDate(nextEvent.year, nextEvent.month, nextEvent.day, getLocale());
                var timeText = window.NjcEvents.toDisplayTime(nextEvent.hour, nextEvent.minute);
                var title = nextEvent.title || t("events.event", "Event");
                var body = title + " - " + dateText + " " + t("common.at", "at") + " " + timeText + " (" + t("common.belgiumTime", "Belgium time") + ")";

                return showNotification({
                    title: t("notify.eventSoonTitle", "Event reminder"),
                    body: body,
                    tag: notifyKey,
                    url: "#events"
                }).then(function (sent) {
                    if (sent) {
                        markAsNotified(notifyKey);
                    }
                    return null;
                });
            })
            .catch(function () {
                return null;
            });
    }

    function normalizeBroadcastCategory(value) {
        var key = String(value || "").trim().toLowerCase();
        if (key === "events" || key === "sermons" || key === "prayer" || key === "contact") {
            return key;
        }
        return "general";
    }

    function getBroadcastRouteForCategory(category) {
        var key = normalizeBroadcastCategory(category);
        if (key === "events") {
            return "#events";
        }
        if (key === "sermons") {
            return "#sermons";
        }
        if (key === "prayer") {
            return "#prayer";
        }
        if (key === "contact") {
            return "#contact";
        }
        return "#home";
    }

    function normalizeBroadcastTargetUrl(value, category) {
        var raw = String(value || "").trim();
        if (/^https?:\/\//i.test(raw)) {
            return raw;
        }
        if (/^#[a-z0-9/_-]*$/i.test(raw)) {
            return raw;
        }
        return getBroadcastRouteForCategory(category);
    }

    function getBroadcastCategoryLabel(category) {
        var key = normalizeBroadcastCategory(category);
        if (key === "events") {
            return t("admin.broadcastCategoryEvents", "Events");
        }
        if (key === "sermons") {
            return t("admin.broadcastCategorySermons", "Sermons");
        }
        if (key === "prayer") {
            return t("admin.broadcastCategoryPrayer", "Prayer");
        }
        if (key === "contact") {
            return t("admin.broadcastCategoryContact", "Contact");
        }
        return t("admin.broadcastCategoryGeneral", "General");
    }

    function checkNewSermonNotification(status) {
        var timeoutMs = 15000;
        var timeoutPromise = new Promise(function (_, reject) {
            setTimeout(function () { reject(new Error("Timeout")); }, timeoutMs);
        });
        return Promise.race([
            Promise.allSettled([
                fetch(SERMONS_FEED_URL).then(function (r) {
                    if (!r.ok) throw new Error("Load failed");
                    return r.json();
                }),
                fetch(ADMIN_SERMONS_URL + "?ts=" + Date.now(), { cache: "no-store" }).then(function (r) {
                    if (r.status === 404) return [];
                    if (!r.ok) throw new Error("Load failed");
                    return r.json().then(function (p) {
                        return Array.isArray(p) ? p : (p && Array.isArray(p.entries) ? p.entries : []);
                    });
                })
            ]),
            timeoutPromise
        ]).then(function (results) {
            var github = (results[0] && results[0].status === "fulfilled" && Array.isArray(results[0].value)) ? results[0].value : [];
            var admin = (results[1] && results[1].status === "fulfilled" && Array.isArray(results[1].value)) ? results[1].value : [];
            var merged = github.concat(admin).filter(function (item) { return item && item.title; });
            var sorted = merged.sort(function (a, b) {
                return String(b.date || b.createdAt || "").localeCompare(String(a.date || a.createdAt || ""));
            });
            var latest = sorted[0];
            return latest;
        })
            .then(function (latest) {
                if (!latest) return null;

                var latestKey = String(latest.date || latest.createdAt || "") + "|" + String(latest.title || "");
                var previousKey = "";
                try {
                    previousKey = window.localStorage.getItem(NOTIFICATION_LAST_SERMON_KEY) || "";
                } catch (err) {
                    previousKey = "";
                }

                if (!previousKey) {
                    try {
                        window.localStorage.setItem(NOTIFICATION_LAST_SERMON_KEY, latestKey);
                    } catch (err) {
                        return null;
                    }
                    return null;
                }

                if (latestKey === previousKey) {
                    return null;
                }

                var notifyKey = "sermon:" + latestKey;
                addInAppNotification({
                    id: notifyKey,
                    kind: "sermon",
                    title: t("notify.newSermonTitle", "New sermon available"),
                    body: latest.title || "Latest message is ready to listen",
                    url: "#sermons",
                    createdAt: Date.now()
                });

                try {
                    window.localStorage.setItem(NOTIFICATION_LAST_SERMON_KEY, latestKey);
                } catch (err) {
                    return null;
                }

                var canPush = Boolean(status && status.enabled && status.supported && status.permission === "granted");
                if (!canPush || wasNotified(notifyKey)) {
                    return null;
                }
                return showNotification({
                    title: t("notify.newSermonTitle", "New sermon available"),
                    body: latest.title || "Latest message is ready to listen",
                    tag: notifyKey,
                    url: "#sermons"
                }).then(function (sent) {
                    if (sent) {
                        markAsNotified(notifyKey);
                    }
                    return null;
                });
            })
            .catch(function () {
                return null;
            });
    }

    document.addEventListener("njc:admin-sermons-updated", function () {
        runNotificationChecks();
    });

    function checkNewPrayerNotification(status) {
        return fetch(PRAYER_WALL_FEED_URL + "?ts=" + String(Date.now()), { cache: "no-store" })
            .then(function (response) {
                if (!response.ok) {
                    throw new Error("Unable to load prayer wall");
                }
                return response.json();
            })
            .then(function (payload) {
                var entries = payload && Array.isArray(payload.entries) ? payload.entries : [];
                var publicEntries = entries.filter(function (e) {
                    return e && e.approved !== false;
                });
                if (!publicEntries.length) {
                    return null;
                }
                var sorted = publicEntries.slice().sort(function (a, b) {
                    var aTime = String((a && (a.updatedAt || a.createdAt)) || "");
                    var bTime = String((b && (b.updatedAt || b.createdAt)) || "");
                    return bTime.localeCompare(aTime);
                });
                var latest = sorted[0] || {};
                var latestTime = String(latest.updatedAt || latest.createdAt || "").trim();
                var latestMessage = String(latest.message || "").trim();
                if (!latestTime || !latestMessage) {
                    return null;
                }

                var latestKey = latestTime + "|" + latestMessage.slice(0, 80);
                var previousKey = "";
                try {
                    previousKey = window.localStorage.getItem(NOTIFICATION_LAST_PRAYER_KEY) || "";
                } catch (err) {
                    previousKey = "";
                }

                if (!previousKey) {
                    try {
                        window.localStorage.setItem(NOTIFICATION_LAST_PRAYER_KEY, latestKey);
                    } catch (err) {
                        return null;
                    }
                    return null;
                }

                if (latestKey === previousKey) {
                    return null;
                }

                var author = latest.anonymous
                    ? t("contact.prayerWallNameAnonymous", "Anonymous")
                    : String(latest.name || "").trim() || t("contact.prayerWallNameAnonymous", "Anonymous");
                var bodyText = author + ": " + latestMessage;
                var notifyKey = "prayer:" + latestKey;

                addInAppNotification({
                    id: notifyKey,
                    kind: "prayer",
                    title: t("notify.newPrayerTitle", "New prayer request posted"),
                    body: bodyText.length > 120 ? (bodyText.slice(0, 117) + "...") : bodyText,
                    url: "#prayer",
                    createdAt: Date.now()
                });

                try {
                    window.localStorage.setItem(NOTIFICATION_LAST_PRAYER_KEY, latestKey);
                } catch (err) {
                    return null;
                }

                var canPush = Boolean(status && status.enabled && status.supported && status.permission === "granted");
                if (!canPush || wasNotified(notifyKey)) {
                    return null;
                }
                return showNotification({
                    title: t("notify.newPrayerTitle", "New prayer request posted"),
                    body: bodyText.length > 120 ? (bodyText.slice(0, 117) + "...") : bodyText,
                    tag: notifyKey,
                    url: "#prayer"
                }).then(function (sent) {
                    if (sent) {
                        markAsNotified(notifyKey);
                    }
                    return null;
                });
            })
            .catch(function () {
                return null;
            });
    }

    function checkNewMailboxNotification(status) {
        if (!isAdminUser()) {
            return Promise.resolve(null);
        }
        return fetch(CONTACT_FORM_FEED_URL + "?ts=" + String(Date.now()), { cache: "no-store" })
            .then(function (response) {
                if (response.status === 404) {
                    return [];
                }
                if (!response.ok) {
                    throw new Error("Unable to load contact messages");
                }
                return response.json().then(function (payload) {
                    return payload && Array.isArray(payload.entries) ? payload.entries : [];
                });
            })
            .then(function (entries) {
                if (!entries.length) {
                    return null;
                }
                var sorted = entries.slice().sort(function (a, b) {
                    var aTime = String((a && (a.updatedAt || a.createdAt)) || "");
                    var bTime = String((b && (b.updatedAt || b.createdAt)) || "");
                    return bTime.localeCompare(aTime);
                });
                var latest = sorted[0] || {};
                var latestTime = String(latest.updatedAt || latest.createdAt || "").trim();
                var latestMessage = String(latest.message || "").trim();
                if (!latestTime || !latestMessage) {
                    return null;
                }

                var latestKey = latestTime + "|" + latestMessage.slice(0, 80);
                var previousKey = "";
                try {
                    previousKey = window.localStorage.getItem(NOTIFICATION_LAST_MAILBOX_KEY) || "";
                } catch (err) {
                    previousKey = "";
                }
                if (!previousKey) {
                    try {
                        window.localStorage.setItem(NOTIFICATION_LAST_MAILBOX_KEY, latestKey);
                    } catch (err) {
                        return null;
                    }
                    return null;
                }
                if (latestKey === previousKey) {
                    return null;
                }

                var sender = String(latest.name || "").trim() || String(latest.createdByEmail || "").trim() || "Anonymous";
                var bodyText = sender + ": " + latestMessage;
                var compactBody = bodyText.length > 120 ? (bodyText.slice(0, 117) + "...") : bodyText;
                var notifyKey = "mailbox:" + latestKey;
                addInAppNotification({
                    id: notifyKey,
                    kind: "mailbox",
                    title: t("notify.newMailboxTitle", "New message received"),
                    body: compactBody,
                    url: "#mailbox",
                    createdAt: Date.now()
                });

                try {
                    window.localStorage.setItem(NOTIFICATION_LAST_MAILBOX_KEY, latestKey);
                } catch (err) {
                    return null;
                }

                var canPush = Boolean(status && status.enabled && status.supported && status.permission === "granted");
                if (!canPush || wasNotified(notifyKey)) {
                    return null;
                }
                return showNotification({
                    title: t("notify.newMailboxTitle", "New message received"),
                    body: compactBody,
                    tag: notifyKey,
                    url: "#mailbox"
                }).then(function (sent) {
                    if (sent) {
                        markAsNotified(notifyKey);
                    }
                    return null;
                });
            })
            .catch(function () {
                return null;
            });
    }

    function checkNewNoticeNotification(status, options) {
        var config = options && typeof options === "object" ? options : {};
        return fetch(ADMIN_NOTICES_FEED_URL + "?ts=" + String(Date.now()), { cache: "no-store" })
            .then(function (response) {
                if (response.status === 404) {
                    return [];
                }
                if (!response.ok) {
                    throw new Error("Unable to load notices");
                }
                return response.json().then(function (payload) {
                    return payload && Array.isArray(payload.entries) ? payload.entries : [];
                });
            })
            .then(function (entries) {
                if (!entries.length) {
                    return null;
                }
                var sorted = entries.slice().sort(function (a, b) {
                    var aTime = String((a && (a.updatedAt || a.createdAt || a.date)) || "");
                    var bTime = String((b && (b.updatedAt || b.createdAt || b.date)) || "");
                    return bTime.localeCompare(aTime);
                });
                var latest = sorted[0] || {};
                var title = String(latest.title || "").trim();
                var body = String(latest.body || "").trim();
                var titleTa = String(latest.titleTa || "").trim();
                var bodyTa = String(latest.bodyTa || "").trim();
                var imageUrl = String(latest.imageUrl || latest.image || latest.bannerImageUrl || latest.coverImageUrl || "").trim();
                var localizedTitle = activeLanguage === "ta" ? (titleTa || title) : title;
                var localizedBody = activeLanguage === "ta" ? (bodyTa || body) : body;
                var fallbackTitle = t("home.announcementImageOnlyTitle", "Image announcement");
                var latestTime = String(latest.updatedAt || latest.createdAt || latest.date || "").trim();
                var latestTitleForKey = title || body || titleTa || bodyTa || imageUrl || "notice";
                if (!latestTime || !latestTitleForKey) {
                    return null;
                }
                var latestKey = latestTime + "|" + latestTitleForKey.slice(0, 80);
                var previousKey = "";
                try {
                    previousKey = window.localStorage.getItem(NOTIFICATION_LAST_NOTICE_KEY) || "";
                } catch (err) {
                    previousKey = "";
                }
                var hadPreviousKey = Boolean(previousKey);
                if (!previousKey) {
                    try {
                        window.localStorage.setItem(NOTIFICATION_LAST_NOTICE_KEY, latestKey);
                    } catch (err) {
                        return null;
                    }
                    if (!config.allowFirstNotification) {
                        return null;
                    }
                }
                if (hadPreviousKey && latestKey === previousKey) {
                    return null;
                }
                var bodyText = localizedBody || localizedTitle || body || title || (imageUrl ? fallbackTitle : "");
                var compactBody = bodyText.length > 120 ? (bodyText.slice(0, 117) + "...") : bodyText;
                var notifyKey = "notice:" + latestKey;
                addInAppNotification({
                    id: notifyKey,
                    kind: "notice",
                    title: t("notify.newNoticeTitle", "New notice posted"),
                    body: compactBody || localizedTitle || fallbackTitle,
                    url: "#home",
                    createdAt: Date.now()
                });
                try {
                    window.localStorage.setItem(NOTIFICATION_LAST_NOTICE_KEY, latestKey);
                } catch (err) {
                    return null;
                }
                var canPush = Boolean(status && status.enabled && status.supported && status.permission === "granted");
                if (!canPush || wasNotified(notifyKey)) {
                    return null;
                }
                return showNotification({
                    title: t("notify.newNoticeTitle", "New notice posted"),
                    body: compactBody || localizedTitle || fallbackTitle,
                    tag: notifyKey,
                    url: "#home"
                }).then(function (sent) {
                    if (sent) {
                        markAsNotified(notifyKey);
                    }
                    return null;
                });
            })
            .catch(function () {
                return null;
            });
    }

    function checkNewBroadcastNotification(status, options) {
        var config = options && typeof options === "object" ? options : {};
        return fetch(ADMIN_BROADCASTS_FEED_URL + "?ts=" + String(Date.now()), { cache: "no-store" })
            .then(function (response) {
                if (response.status === 404) {
                    return [];
                }
                if (!response.ok) {
                    throw new Error("Unable to load broadcasts");
                }
                return response.json().then(function (payload) {
                    return payload && Array.isArray(payload.entries) ? payload.entries : [];
                });
            })
            .then(function (entries) {
                if (!entries.length) {
                    return null;
                }
                var sorted = entries.slice().sort(function (a, b) {
                    var aTime = String((a && (a.updatedAt || a.createdAt || a.date)) || "");
                    var bTime = String((b && (b.updatedAt || b.createdAt || b.date)) || "");
                    return bTime.localeCompare(aTime);
                });
                var latest = sorted[0] || {};
                var title = String(latest.title || "").trim();
                var body = String(latest.body || "").trim();
                var titleTa = String(latest.titleTa || "").trim();
                var bodyTa = String(latest.bodyTa || "").trim();
                var localizedTitle = activeLanguage === "ta" ? (titleTa || title) : title;
                var localizedBody = activeLanguage === "ta" ? (bodyTa || body) : body;
                var latestTime = String(latest.updatedAt || latest.createdAt || latest.date || "").trim();
                if (!latestTime || !title) {
                    return null;
                }
                var latestKey = String(latest.id || "") + "|" + latestTime + "|" + title.slice(0, 80);
                var previousKey = "";
                try {
                    previousKey = window.localStorage.getItem(NOTIFICATION_LAST_BROADCAST_KEY) || "";
                } catch (err) {
                    previousKey = "";
                }
                var hadPreviousKey = Boolean(previousKey);
                if (!previousKey) {
                    try {
                        window.localStorage.setItem(NOTIFICATION_LAST_BROADCAST_KEY, latestKey);
                    } catch (err) {
                        return null;
                    }
                    if (!config.allowFirstNotification) {
                        return null;
                    }
                }
                if (hadPreviousKey && latestKey === previousKey) {
                    return null;
                }
                var category = normalizeBroadcastCategory(latest.category);
                var categoryLabel = getBroadcastCategoryLabel(category);
                var targetUrl = normalizeBroadcastTargetUrl(latest.url, category);
                var bodyText = localizedBody || localizedTitle || body || title;
                var decoratedBody = categoryLabel
                    ? ("[" + categoryLabel + "] " + bodyText)
                    : bodyText;
                var compactBody = decoratedBody.length > 120 ? (decoratedBody.slice(0, 117) + "...") : decoratedBody;
                var notifyKey = "broadcast:" + latestKey;
                addInAppNotification({
                    id: notifyKey,
                    kind: "broadcast",
                    title: localizedTitle || t("notify.newBroadcastTitle", "New broadcast message"),
                    body: compactBody,
                    url: targetUrl,
                    createdAt: Date.now()
                });
                try {
                    window.localStorage.setItem(NOTIFICATION_LAST_BROADCAST_KEY, latestKey);
                } catch (err) {
                    return null;
                }
                var canPush = Boolean(status && status.enabled && status.supported && status.permission === "granted");
                if (!canPush || wasNotified(notifyKey)) {
                    return null;
                }
                return showNotification({
                    title: localizedTitle || t("notify.newBroadcastTitle", "New broadcast message"),
                    body: compactBody,
                    tag: notifyKey,
                    url: targetUrl
                }).then(function (sent) {
                    if (sent) {
                        markAsNotified(notifyKey);
                    }
                    return null;
                });
            })
            .catch(function () {
                return null;
            });
    }

    function checkTriviaReminder() {
        if (!notificationsSupported() || getNotificationPermission() !== "granted") {
            return;
        }
        if (window.NjcAppModules && typeof window.NjcAppModules.isModuleEnabled === "function" && !window.NjcAppModules.isModuleEnabled("trivia")) {
            return;
        }
        var settings = getNotificationSettings();
        if (!settings.enabled) return;
        var now = new Date();
        var brussels = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Brussels" }));
        var dow = brussels.getDay();
        var hour = brussels.getHours();
        var minute = brussels.getMinutes();
        if (dow === 0 || dow === 6) return;
        if (hour !== 0 || minute >= 10) return;
        var y = brussels.getFullYear();
        var m = String(brussels.getMonth() + 1).padStart(2, "0");
        var d = String(brussels.getDate()).padStart(2, "0");
        var key = "trivia:" + y + "-" + m + "-" + d;
        if (wasNotified(key)) return;
        showNotification({
            title: t("notify.triviaReminderTitle", "Bible Quiz"),
            body: t("notify.triviaReminderBody", "Today's Tamil Bible quiz is ready! Tap to play."),
            tag: key,
            url: "#home"
        }).then(function (sent) {
            if (sent) markAsNotified(key);
        });
    }

    function runNotificationChecks() {
        var status = getNotificationStatus();
        if (status.supported && status.enabled && status.permission === "granted") {
            checkEventReminder();
            checkTriviaReminder();
        }
        checkNewSermonNotification(status);
        checkNewPrayerNotification(status);
        checkNewMailboxNotification(status);
        checkNewNoticeNotification(status);
        checkNewBroadcastNotification(status);
    }

    function startNotificationLoop() {
        if (notificationIntervalId) {
            window.clearInterval(notificationIntervalId);
        }
        runNotificationChecks();
        notificationIntervalId = window.setInterval(runNotificationChecks, 5 * 60 * 1000);
    }

    function stopNotificationLoop() {
        if (notificationIntervalId) {
            window.clearInterval(notificationIntervalId);
            notificationIntervalId = null;
        }
    }

    function syncNotificationLoop() {
        startNotificationLoop();
    }

    function requestNotificationPermission() {
        if (!notificationsSupported()) {
            return Promise.resolve("unsupported");
        }
        if (Notification.permission === "granted") {
            return Promise.resolve("granted");
        }
        if (Notification.permission === "denied") {
            return Promise.resolve("denied");
        }
        return Notification.requestPermission();
    }

    function toggleNotificationsEnabled() {
        var status = getNotificationStatus();
        if (!status.supported) {
            emitNotificationStatus();
            return Promise.resolve(getNotificationStatus());
        }

        if (status.enabled) {
            setNotificationSettings({ enabled: false, reminderMinutes: status.reminderMinutes });
            return teardownFcmPushRegistration().finally(function () {
                syncNotificationLoop();
                emitNotificationStatus();
            }).then(function () {
                return getNotificationStatus();
            });
        }

        return requestNotificationPermission().then(function (permission) {
            if (permission === "granted") {
                setNotificationSettings({ enabled: true, reminderMinutes: status.reminderMinutes });
            } else {
                setNotificationSettings({ enabled: false, reminderMinutes: status.reminderMinutes });
            }
            syncNotificationLoop();
            emitNotificationStatus();
            return ensureFcmPushRegistration().then(function () {
                return getNotificationStatus();
            });
        });
    }

    function setNotificationReminderMinutes(minutes) {
        var status = getNotificationStatus();
        var nextMinutes = normalizeReminderMinutes(minutes);
        setNotificationSettings({
            enabled: status.enabled,
            reminderMinutes: nextMinutes
        });
        emitNotificationStatus();
        runNotificationChecks();
        return getNotificationStatus();
    }

    function setupNotifications() {
        window.NjcNotifications = {
            getStatus: getNotificationStatus,
            toggleEnabled: toggleNotificationsEnabled,
            setReminderMinutes: setNotificationReminderMinutes,
            requestPermission: requestNotificationPermission,
            refreshNow: function () {
                runNotificationChecks();
            }
        };
        window.NjcInAppNotifications = {
            getItems: getInAppNotificationItems,
            getUnreadCount: getInAppUnreadCount,
            markRead: markInAppNotificationRead,
            markAllRead: markAllInAppNotificationsRead,
            clearRead: clearReadInAppNotifications
        };
        syncNotificationLoop();
        emitNotificationStatus();
        saveInAppNotificationItems(getInAppNotificationItems());
        ensureFcmPushRegistration();
        document.addEventListener("visibilitychange", function () {
            if (!document.hidden) {
                runNotificationChecks();
            }
        });
        document.addEventListener("njc:authchange", function () {
            ensureFcmPushRegistration();
            runNotificationChecks();
        });
        document.addEventListener("njc:admin-broadcast-updated", function () {
            var status = getNotificationStatus();
            checkNewBroadcastNotification(status, { allowFirstNotification: true }).finally(function () {
                runNotificationChecks();
            });
        });
        document.addEventListener("njc:admin-notices-updated", function () {
            var status = getNotificationStatus();
            checkNewNoticeNotification(status, { allowFirstNotification: true });
        });
    }

    function setupNotificationQuickButton() {
        var header = document.querySelector(".app-header");
        if (!header || document.getElementById("notification-quick-btn")) {
            return;
        }

        var controls = ensureHeaderControls(header);
        var button = document.createElement("button");
        button.id = "notification-quick-btn";
        button.className = "notify-toggle";
        button.type = "button";
        button.innerHTML = "<i class=\"fa-solid fa-bell\"></i>";
        controls.appendChild(button);

        var panel = document.createElement("div");
        panel.id = "notification-quick-panel";
        panel.className = "notification-popover";
        panel.hidden = true;

        var title = document.createElement("p");
        title.className = "notification-popover-title";

        var statusText = document.createElement("p");
        statusText.className = "page-note notification-popover-status";

        var controlsRow = document.createElement("div");
        controlsRow.className = "notify-controls-row";

        var label = document.createElement("label");
        label.className = "notify-label";
        label.setAttribute("for", "notification-quick-reminder");
        controlsRow.appendChild(label);

        var reminderSelect = document.createElement("select");
        reminderSelect.id = "notification-quick-reminder";
        reminderSelect.className = "notify-select";
        reminderSelect.innerHTML = "" +
            "<option value=\"15\"></option>" +
            "<option value=\"30\"></option>" +
            "<option value=\"60\"></option>";
        controlsRow.appendChild(reminderSelect);

        var toggleButton = document.createElement("button");
        toggleButton.type = "button";
        toggleButton.className = "button-link notification-popover-toggle";

        panel.appendChild(title);
        panel.appendChild(statusText);
        panel.appendChild(controlsRow);
        panel.appendChild(toggleButton);
        document.body.appendChild(panel);

        var closeTimerId = null;

        function setButtonLabel() {
            var labelText = t("notify.quickOpen", "Notification settings");
            button.setAttribute("aria-label", labelText);
            button.title = labelText;
        }

        function positionPanel() {
            if (panel.hidden) {
                return;
            }
            var rect = button.getBoundingClientRect();
            var desiredWidth = Math.min(236, window.innerWidth - 24);
            var left = rect.right - desiredWidth;
            if (left < 12) {
                left = 12;
            }
            if (left + desiredWidth > window.innerWidth - 12) {
                left = window.innerWidth - desiredWidth - 12;
            }
            panel.style.width = desiredWidth + "px";
            panel.style.top = (rect.bottom + 8) + "px";
            panel.style.left = left + "px";
        }

        function closePanel() {
            panel.hidden = true;
            button.setAttribute("aria-expanded", "false");
            if (closeTimerId) {
                window.clearTimeout(closeTimerId);
                closeTimerId = null;
            }
        }

        function queueAutoClose() {
            if (closeTimerId) {
                window.clearTimeout(closeTimerId);
            }
            closeTimerId = window.setTimeout(closePanel, 650);
        }

        function renderPanel() {
            title.textContent = t("notify.title", "Notifications");
            label.textContent = t("notify.reminderLabel", "Reminder time");
            reminderSelect.options[0].textContent = t("notify.reminder15", "15 min before");
            reminderSelect.options[1].textContent = t("notify.reminder30", "30 min before");
            reminderSelect.options[2].textContent = t("notify.reminder60", "60 min before");

            if (!window.NjcNotifications || typeof window.NjcNotifications.getStatus !== "function") {
                statusText.textContent = t("notify.statusUnsupported", "Notifications are not supported on this device.");
                toggleButton.textContent = t("notify.enable", "Enable Notifications");
                toggleButton.disabled = true;
                reminderSelect.disabled = true;
                return;
            }

            var status = window.NjcNotifications.getStatus();
            reminderSelect.value = String(status.reminderMinutes || 60);
            reminderSelect.disabled = false;
            toggleButton.disabled = false;

            if (!status.supported || status.permission === "unsupported") {
                statusText.textContent = t("notify.statusUnsupported", "Notifications are not supported on this device.");
                toggleButton.textContent = t("notify.enable", "Enable Notifications");
                toggleButton.disabled = true;
                reminderSelect.disabled = true;
                return;
            }

            if (status.permission === "denied") {
                statusText.textContent = t("notify.statusBlocked", "Notifications are blocked in browser settings.");
                toggleButton.textContent = t("notify.enable", "Enable Notifications");
                return;
            }

            if (status.enabled && status.permission === "granted") {
                statusText.textContent = t("notify.statusOn", "Notifications are active.");
                toggleButton.textContent = t("notify.disable", "Disable Notifications");
                return;
            }

            statusText.textContent = t("notify.statusOff", "Notifications are currently off.");
            toggleButton.textContent = t("notify.enable", "Enable Notifications");
        }

        function togglePanel(event) {
            if (event) {
                event.stopPropagation();
            }
            if (panel.hidden) {
                renderPanel();
                panel.hidden = false;
                button.setAttribute("aria-expanded", "true");
                positionPanel();
            } else {
                closePanel();
            }
        }

        setButtonLabel();
        button.setAttribute("aria-haspopup", "dialog");
        button.setAttribute("aria-expanded", "false");

        button.addEventListener("click", togglePanel);
        panel.addEventListener("click", function (event) {
            event.stopPropagation();
        });

        toggleButton.addEventListener("click", function () {
            if (!window.NjcNotifications || typeof window.NjcNotifications.toggleEnabled !== "function") {
                renderPanel();
                return;
            }
            window.NjcNotifications.toggleEnabled().then(function () {
                renderPanel();
                queueAutoClose();
            });
        });

        reminderSelect.addEventListener("change", function () {
            if (!window.NjcNotifications || typeof window.NjcNotifications.setReminderMinutes !== "function") {
                return;
            }
            window.NjcNotifications.setReminderMinutes(Number(reminderSelect.value));
            renderPanel();
            queueAutoClose();
        });

        document.addEventListener("click", function (event) {
            if (!panel.hidden && !panel.contains(event.target) && event.target !== button) {
                closePanel();
            }
        });

        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape") {
                closePanel();
            }
        });

        window.addEventListener("resize", function () {
            positionPanel();
        });

        window.addEventListener("scroll", function () {
            if (!panel.hidden) {
                closePanel();
            }
        }, true);

        window.addEventListener("hashchange", function () {
            closePanel();
        });

        document.addEventListener("njc:notificationstatus", function () {
            renderPanel();
        });

        document.addEventListener("njc:langchange", function () {
            setButtonLabel();
            renderPanel();
        });
    }

    function setupHeaderHamburgerMenu() {
        var header = document.querySelector(".app-header");
        if (!header || document.getElementById("header-menu-btn")) {
            return;
        }

        var controls = ensureHeaderControls(header);
        var button = document.createElement("button");
        button.id = "header-menu-btn";
        button.className = "menu-toggle";
        button.type = "button";
        button.innerHTML = "<i class=\"fa-solid fa-bars\"></i>";
        controls.appendChild(button);

        var notificationsButton = document.createElement("button");
        notificationsButton.type = "button";
        notificationsButton.className = "notify-toggle header-notification-toggle";
        notificationsButton.innerHTML = "<i class=\"fa-solid fa-bell\"></i><em class=\"header-menu-unread\" hidden>0</em>";
        controls.appendChild(notificationsButton);

        var panel = document.createElement("div");
        panel.id = "header-menu-panel";
        panel.className = "header-menu-popover";
        panel.hidden = true;
        panel.setAttribute("role", "dialog");
        panel.setAttribute("aria-modal", "true");

        var backdrop = document.createElement("button");
        backdrop.id = "header-menu-backdrop";
        backdrop.className = "header-menu-backdrop";
        backdrop.type = "button";
        backdrop.hidden = true;
        backdrop.setAttribute("aria-hidden", "true");
        document.body.appendChild(backdrop);

        var panelTop = document.createElement("div");
        panelTop.className = "header-menu-top";
        var panelTitle = document.createElement("strong");
        panelTitle.className = "header-menu-title";
        var panelClose = document.createElement("button");
        panelClose.type = "button";
        panelClose.className = "header-menu-close";
        panelClose.innerHTML = "<i class=\"fa-solid fa-xmark\"></i>";
        panelTop.appendChild(panelTitle);
        panelTop.appendChild(panelClose);
        panel.appendChild(panelTop);

        var menuScroll = document.createElement("div");
        menuScroll.className = "header-menu-scroll";

        var userSummary = document.createElement("div");
        userSummary.className = "header-menu-user";
        userSummary.innerHTML = "" +
            "<div class=\"header-menu-user-avatar\">" +
            "  <img class=\"header-menu-user-avatar-image\" alt=\"User photo\" hidden>" +
            "  <span class=\"header-menu-user-avatar-fallback\">U</span>" +
            "</div>" +
            "<div class=\"header-menu-user-copy\">" +
            "  <strong class=\"header-menu-user-name\"></strong>" +
            "  <span class=\"page-note header-menu-user-email\"></span>" +
            "</div>";
        menuScroll.appendChild(userSummary);
        var userAvatarImage = userSummary.querySelector(".header-menu-user-avatar-image");
        var userAvatarFallback = userSummary.querySelector(".header-menu-user-avatar-fallback");
        var userNameNode = userSummary.querySelector(".header-menu-user-name");
        var userEmailNode = userSummary.querySelector(".header-menu-user-email");

        var quickPrefsCard = document.createElement("section");
        quickPrefsCard.className = "header-menu-card header-menu-quick-prefs";
        menuScroll.appendChild(quickPrefsCard);
        var quickPrefsNav = document.createElement("nav");
        quickPrefsNav.className = "header-menu-tabs";
        quickPrefsCard.appendChild(quickPrefsNav);

        var menuLanguageBtn = document.createElement("button");
        menuLanguageBtn.type = "button";
        menuLanguageBtn.className = "header-menu-link header-menu-action header-menu-quick-pref";
        menuLanguageBtn.id = "header-menu-language-btn";
        menuLanguageBtn.innerHTML = "<i class=\"fa-solid fa-language\" aria-hidden=\"true\"></i><span class=\"header-menu-quick-pref-label\"></span><span class=\"header-menu-quick-pref-value\"></span>";
        quickPrefsNav.appendChild(menuLanguageBtn);

        var menuThemeBtn = document.createElement("button");
        menuThemeBtn.type = "button";
        menuThemeBtn.className = "header-menu-link header-menu-action header-menu-quick-pref";
        menuThemeBtn.id = "header-menu-theme-btn";
        menuThemeBtn.innerHTML = "<span class=\"header-menu-theme-icon-wrap\"></span><span class=\"header-menu-quick-pref-label\"></span><span class=\"header-menu-quick-pref-value\"></span>";
        quickPrefsNav.appendChild(menuThemeBtn);

        menuLanguageBtn.addEventListener("click", function () {
            var next = activeLanguage === "ta" ? "en" : "ta";
            setLanguage(next, true, true);
        });
        menuThemeBtn.addEventListener("click", function () {
            var nextTheme = (document.documentElement.getAttribute("data-theme") === "dark") ? "light" : "dark";
            applyTheme(nextTheme);
            persistTheme(nextTheme);
            var headerThemeBtn = document.getElementById("theme-toggle-btn");
            if (headerThemeBtn) {
                setToggleIcon(headerThemeBtn, nextTheme);
            }
            refreshMenuQuickPrefs();
            document.dispatchEvent(new CustomEvent("njc:themechange", { detail: { theme: nextTheme } }));
        });

        function appendMenuSpacer() {
            var sp = document.createElement("div");
            sp.className = "header-menu-spacer";
            sp.setAttribute("aria-hidden", "true");
            menuScroll.appendChild(sp);
        }

        function refreshMenuQuickPrefs() {
            var langLabel = menuLanguageBtn.querySelector(".header-menu-quick-pref-label");
            var langValue = menuLanguageBtn.querySelector(".header-menu-quick-pref-value");
            var themeLabel = menuThemeBtn.querySelector(".header-menu-quick-pref-label");
            var themeValue = menuThemeBtn.querySelector(".header-menu-quick-pref-value");
            var iconWrap = menuThemeBtn.querySelector(".header-menu-theme-icon-wrap");
            if (langLabel) {
                langLabel.textContent = t("menu.quickLanguage", "Language");
            }
            if (langValue) {
                langValue.textContent = activeLanguage === "ta"
                    ? t("settings.languageTamil", "Tamil")
                    : t("settings.languageEnglish", "English");
            }
            if (themeLabel) {
                themeLabel.textContent = t("menu.quickTheme", "Theme");
            }
            var themeNow = document.documentElement.getAttribute("data-theme") || getActiveTheme();
            if (themeValue) {
                themeValue.textContent = themeNow === "dark"
                    ? t("settings.themeDark", "Dark mode")
                    : t("settings.themeLight", "Light mode");
            }
            if (iconWrap) {
                var iconClass = themeNow === "dark" ? "fa-sun" : "fa-moon";
                iconWrap.innerHTML = "<i class=\"fa-solid " + iconClass + "\" aria-hidden=\"true\"></i>";
            }
            var nextLang = activeLanguage === "ta" ? "en" : "ta";
            var langToggleHint = nextLang === "ta"
                ? t("toggle.language.toTamil", "Switch language to Tamil")
                : t("toggle.language.toEnglish", "Switch language to English");
            menuLanguageBtn.setAttribute("aria-label", langToggleHint);
            menuLanguageBtn.title = langToggleHint;
            var themeToggleHint = themeNow === "dark"
                ? t("toggle.theme.toLight", "Switch to light mode")
                : t("toggle.theme.toDark", "Switch to dark mode");
            menuThemeBtn.setAttribute("aria-label", themeToggleHint);
            menuThemeBtn.title = themeToggleHint;
        }

        var authCard = document.createElement("section");
        authCard.className = "header-menu-card";
        menuScroll.appendChild(authCard);
        var authNav = document.createElement("nav");
        authNav.className = "header-menu-tabs";
        authCard.appendChild(authNav);

        var authButton = document.createElement("button");
        authButton.type = "button";
        authButton.className = "header-menu-link header-menu-action";
        authButton.innerHTML = "<i class=\"fa-solid fa-right-to-bracket\"></i><span></span>";
        authNav.appendChild(authButton);

        appendMenuSpacer();

        var bibleSongCard = document.createElement("section");
        bibleSongCard.className = "header-menu-card";
        menuScroll.appendChild(bibleSongCard);
        var bibleSongLinksContainer = document.createElement("nav");
        bibleSongLinksContainer.className = "header-menu-tabs";
        bibleSongCard.appendChild(bibleSongLinksContainer);

        var bibleLink = document.createElement("a");
        bibleLink.className = "header-menu-link";
        bibleLink.href = "#bible";
        bibleLink.innerHTML = "<i class=\"fa-solid fa-book-bible\"></i><span></span>";
        bibleSongLinksContainer.appendChild(bibleLink);

        var songbookLink = document.createElement("a");
        songbookLink.className = "header-menu-link";
        songbookLink.href = "#songbook";
        songbookLink.innerHTML = "<i class=\"fa-solid fa-music\"></i><span></span>";
        bibleSongLinksContainer.appendChild(songbookLink);

        var dailyBreadMenuLink = document.createElement("a");
        dailyBreadMenuLink.className = "header-menu-link";
        dailyBreadMenuLink.href = "#daily-bread";
        dailyBreadMenuLink.innerHTML = "<i class=\"fa-solid fa-bread-slice\"></i><span></span>";
        bibleSongLinksContainer.appendChild(dailyBreadMenuLink);

        var bookShelfLink = document.createElement("a");
        bookShelfLink.className = "header-menu-link";
        bookShelfLink.href = "#book-shelf";
        bookShelfLink.innerHTML = "<i class=\"fa-solid fa-book-open-reader\"></i><span></span>";
        bibleSongLinksContainer.appendChild(bookShelfLink);

        var kidsLink = document.createElement("a");
        kidsLink.className = "header-menu-link";
        kidsLink.href = "#kids";
        kidsLink.setAttribute("data-route", "kids");
        kidsLink.innerHTML = "<i class=\"fa-solid fa-child-reaching\"></i><span></span>";
        bibleSongLinksContainer.appendChild(kidsLink);

        var triviaLink = document.createElement("a");
        triviaLink.className = "header-menu-link";
        triviaLink.href = "#trivia";
        triviaLink.innerHTML = "<i class=\"fa-solid fa-question-circle\"></i><span></span>";
        bibleSongLinksContainer.appendChild(triviaLink);

        appendMenuSpacer();

        var communityCard = document.createElement("section");
        communityCard.className = "header-menu-card";
        menuScroll.appendChild(communityCard);
        var communityLinksContainer = document.createElement("nav");
        communityLinksContainer.className = "header-menu-tabs";
        communityCard.appendChild(communityLinksContainer);

        var celebrationsLink = document.createElement("a");
        celebrationsLink.className = "header-menu-link";
        celebrationsLink.href = "#celebrations";
        celebrationsLink.setAttribute("data-route", "celebrations");
        celebrationsLink.innerHTML = "<i class=\"fa-solid fa-cake-candles\"></i><span></span>";
        communityLinksContainer.appendChild(celebrationsLink);

        var achievementsLink = document.createElement("a");
        achievementsLink.className = "header-menu-link";
        achievementsLink.href = "#user-achievements";
        achievementsLink.innerHTML = "<i class=\"fa-solid fa-trophy\"></i><span></span>";
        communityLinksContainer.appendChild(achievementsLink);

        var chatLink = document.createElement("a");
        chatLink.className = "header-menu-link";
        chatLink.href = "#chat";
        chatLink.innerHTML = "<i class=\"fa-solid fa-comments\"></i><span></span>";
        communityLinksContainer.appendChild(chatLink);

        var profileLink = document.createElement("a");
        profileLink.className = "header-menu-link";
        profileLink.href = "#profile";
        profileLink.innerHTML = "<i class=\"fa-solid fa-user\"></i><span></span>";
        communityLinksContainer.appendChild(profileLink);

        appendMenuSpacer();

        var utilityCard = document.createElement("section");
        utilityCard.className = "header-menu-card";
        menuScroll.appendChild(utilityCard);
        var utilityLinksContainer = document.createElement("nav");
        utilityLinksContainer.className = "header-menu-tabs";
        utilityCard.appendChild(utilityLinksContainer);

        var settingsLink = document.createElement("a");
        settingsLink.className = "header-menu-link";
        settingsLink.href = "#settings";
        settingsLink.innerHTML = "<i class=\"fa-solid fa-sliders\"></i><span></span>";
        utilityLinksContainer.appendChild(settingsLink);

        var contactMenuLink = document.createElement("a");
        contactMenuLink.className = "header-menu-link";
        contactMenuLink.href = "#contact";
        contactMenuLink.setAttribute("data-route", "contact");
        contactMenuLink.innerHTML = "<i class=\"fa-solid fa-address-book\"></i><span></span>";
        utilityLinksContainer.appendChild(contactMenuLink);

        var mailboxLink = document.createElement("a");
        mailboxLink.className = "header-menu-link";
        mailboxLink.href = "#mailbox";
        mailboxLink.innerHTML = "<i class=\"fa-solid fa-inbox\"></i><span></span>";
        utilityLinksContainer.appendChild(mailboxLink);

        var adminLink = document.createElement("a");
        adminLink.className = "header-menu-link";
        adminLink.href = "#admin";
        adminLink.innerHTML = "<i class=\"fa-solid fa-screwdriver-wrench\"></i><span></span>";
        utilityLinksContainer.appendChild(adminLink);
        panel.appendChild(menuScroll);
        document.body.appendChild(panel);

        var notificationCenter = document.createElement("section");
        notificationCenter.id = "header-notification-center";
        notificationCenter.className = "notification-center-panel";
        notificationCenter.hidden = true;
        notificationCenter.innerHTML = "" +
            "<div class=\"notification-center-top\">" +
            "  <strong class=\"notification-center-title\"></strong>" +
            "  <div class=\"notification-center-actions\">" +
            "    <button type=\"button\" class=\"button-link notification-center-mark-all\"></button>" +
            "    <button type=\"button\" class=\"button-link button-secondary notification-center-clear-read\"></button>" +
            "  </div>" +
            "</div>" +
            "<div class=\"notification-center-list\"></div>";
        document.body.appendChild(notificationCenter);
        var notificationCenterTitle = notificationCenter.querySelector(".notification-center-title");
        var notificationCenterMarkAll = notificationCenter.querySelector(".notification-center-mark-all");
        var notificationCenterClearRead = notificationCenter.querySelector(".notification-center-clear-read");
        var notificationCenterList = notificationCenter.querySelector(".notification-center-list");
        var unreadBadge = notificationsButton.querySelector(".header-menu-unread");

        function getCurrentRoute() {
            var raw = (window.location.hash || "").replace(/^#/, "").trim().toLowerCase();
            var path = raw;
            var q = path.indexOf("?");
            if (q >= 0) {
                path = path.slice(0, q);
            }
            var first = path.split("/").map(function (s) { return s.trim(); }).filter(Boolean)[0] || "";
            if (first === "library") {
                return "book-shelf";
            }
            return first || "home";
        }

        function applyModuleNavVisibility() {
            var m = window.NjcAppModules;
            if (!m || typeof m.isModuleEnabled !== "function" || typeof m.isRouteEnabled !== "function") {
                return;
            }
            document.querySelectorAll(".tab-nav a.tab[href][data-route]").forEach(function (tab) {
                var r = (tab.getAttribute("data-route") || "").trim().toLowerCase();
                if (!r) {
                    return;
                }
                tab.hidden = !m.isRouteEnabled(r);
            });
            bibleLink.hidden = !m.isModuleEnabled("bible");
            songbookLink.hidden = !m.isModuleEnabled("songbook");
            bookShelfLink.hidden = !m.isModuleEnabled("bookShelf");
            kidsLink.hidden = !m.isModuleEnabled("kids");
            dailyBreadMenuLink.hidden = !m.isModuleEnabled("dailyBread");
            triviaLink.hidden = !m.isModuleEnabled("trivia");
            achievementsLink.hidden = !m.isModuleEnabled("userAchievements");
            chatLink.hidden = !m.isModuleEnabled("chat");
            celebrationsLink.hidden = !m.isModuleEnabled("celebrations");
            contactMenuLink.hidden = !m.isModuleEnabled("contact");
        }

        function sanitizeNotificationTargetUrl(rawUrl) {
            var u = String(rawUrl || "#home").trim();
            if (!u || u.charAt(0) !== "#") {
                return u || "#home";
            }
            var path = u.slice(1);
            var q = path.indexOf("?");
            var pathNoQuery = q < 0 ? path : path.slice(0, q);
            var route = pathNoQuery.split("/").map(function (s) { return s.trim(); }).filter(Boolean)[0] || "";
            route = String(route).toLowerCase();
            if (route === "library") {
                route = "book-shelf";
            }
            if (window.NjcAppModules && typeof window.NjcAppModules.isRouteEnabled === "function"
                && route && !window.NjcAppModules.isRouteEnabled(route)) {
                return "#home";
            }
            return u;
        }

        function getInAppApi() {
            return window.NjcInAppNotifications && typeof window.NjcInAppNotifications.getItems === "function"
                ? window.NjcInAppNotifications
                : null;
        }

        function formatNotificationTime(timestamp) {
            var date = new Date(Number(timestamp || 0));
            if (isNaN(date.getTime())) {
                return "";
            }
            var locale = getLocale();
            return new Intl.DateTimeFormat(locale, {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit"
            }).format(date);
        }

        function renderNotificationBadge() {
            if (!unreadBadge) {
                return;
            }
            var api = getInAppApi();
            var unreadCount = api && typeof api.getUnreadCount === "function" ? Number(api.getUnreadCount() || 0) : 0;
            var notificationLabel = t("notify.menuInbox", "Notifications");
            if (unreadCount > 0) {
                unreadBadge.hidden = false;
                unreadBadge.textContent = unreadCount > 99 ? "99+" : String(unreadCount);
                notificationsButton.setAttribute("aria-label", notificationLabel + ": " + String(unreadCount) + " " + t("notify.unread", "unread"));
                notificationsButton.title = notificationLabel;
                return;
            }
            unreadBadge.hidden = true;
            unreadBadge.textContent = "0";
            notificationsButton.setAttribute("aria-label", notificationLabel);
            notificationsButton.title = notificationLabel;
        }

        function renderNotificationCenter() {
            if (!notificationCenterTitle || !notificationCenterMarkAll || !notificationCenterClearRead || !notificationCenterList) {
                return;
            }
            notificationCenterTitle.textContent = t("notify.menuInbox", "Notifications");
            notificationCenterMarkAll.textContent = t("notify.markAllRead", "Mark all read");
            notificationCenterClearRead.textContent = t("notify.clearRead", "Clear read");
            var api = getInAppApi();
            var items = api ? api.getItems() : [];
            if (!Array.isArray(items) || items.length === 0) {
                notificationCenterList.innerHTML = "" +
                    "<article class=\"notification-center-empty\">" +
                    "  <p class=\"notification-center-empty-title\">" + escapeHtml(t("notify.noneTitle", "No new notifications")) + "</p>" +
                    "  <p class=\"page-note\">" + escapeHtml(t("notify.noneBody", "New updates will appear here.")) + "</p>" +
                    "</article>";
                notificationCenterMarkAll.disabled = true;
                notificationCenterClearRead.disabled = true;
                renderNotificationBadge();
                return;
            }

            var unreadCount = items.filter(function (item) { return !item.read; }).length;
            var readCount = items.length - unreadCount;
            notificationCenterMarkAll.disabled = unreadCount === 0;
            notificationCenterClearRead.disabled = readCount === 0;
            var html = items.slice(0, 20).map(function (item) {
                var route = sanitizeNotificationTargetUrl(item.url || "#home");
                var iconClass = "fa-podcast";
                if (item.kind === "prayer") {
                    iconClass = "fa-hands-praying";
                } else if (item.kind === "mailbox") {
                    iconClass = "fa-envelope";
                } else if (item.kind === "notice") {
                    iconClass = "fa-bullhorn";
                } else if (item.kind === "broadcast") {
                    iconClass = "fa-tower-broadcast";
                }
                var readClass = item.read ? "notification-center-item" : "notification-center-item unread";
                return "" +
                    "<button type=\"button\" class=\"" + readClass + "\" data-notification-id=\"" + escapeHtml(item.id || "") + "\" data-notification-url=\"" + escapeHtml(route) + "\">" +
                    "  <span class=\"notification-center-icon\"><i class=\"fa-solid " + iconClass + "\"></i></span>" +
                    "  <span class=\"notification-center-copy\">" +
                    "    <strong class=\"notification-center-item-title\">" + escapeHtml(item.title || "") + "</strong>" +
                    "    <span class=\"notification-center-item-body\">" + escapeHtml(item.body || "") + "</span>" +
                    "    <span class=\"notification-center-item-time\">" + escapeHtml(formatNotificationTime(item.createdAt)) + "</span>" +
                    "  </span>" +
                    "</button>";
            }).join("");
            notificationCenterList.innerHTML = html;
            renderNotificationBadge();
        }

        function setLabels() {
            var openLabel = t("menu.open", "Open menu");
            var titleText = t("menu.title", "Menu");
            var closeText = t("menu.close", "Close menu");
            var profileLabel = t("menu.profile", "Profile");
            var bibleLabel = t("menu.bible", "Bible");
            var songbookLabel = t("menu.songbook", "Songbook");
            var bookShelfLabel = t("menu.bookShelf", "Book shelf");
            var kidsLabel = t("menu.kids", "Kids World");
            var dailyBreadMenuLabel = t("menu.dailyBread", "Daily bread");
            var triviaLabel = t("menu.trivia", "Bible Quiz");
            var achievementsLabel = t("menu.userAchievements", "User achievements");
            var chatLabel = t("menu.chat", "Chat");
            var mailboxLabel = t("menu.mailbox", "Mailbox");
            var adminLabel = t("menu.admin", "Admin Dashboard");
            var settingsLabel = t("menu.settings", "Settings");
            var celebrationsLabel = t("menu.celebrations", "Celebrations");
            var contactMenuLabel = t("menu.contact", "Contact us");
            var authApi = window.NjcAuth;
            var activeUser = authApi && typeof authApi.getUser === "function" ? authApi.getUser() : null;
            var profile = getProfileForUser(activeUser);
            var isLoggedIn = Boolean(activeUser && activeUser.uid);
            var isAdmin = normalizeEmail(activeUser && activeUser.email) === normalizeEmail(ADMIN_EMAIL);
            var displayName = getUserDisplayName(activeUser, profile) || t("menu.profileGuest", "Guest");
            var emailText = String(activeUser && activeUser.email || "").trim();
            var photoUrl = getUserPhotoUrl(activeUser, profile);
            var authLabel = isLoggedIn ? t("menu.logout", "Logout") : t("menu.login", "Login / Register");
            var authIconClass = isLoggedIn ? "fa-right-from-bracket" : "fa-right-to-bracket";
            button.setAttribute("aria-label", openLabel);
            button.title = openLabel;
            panelTitle.textContent = titleText;
            panelClose.setAttribute("aria-label", closeText);
            panelClose.title = closeText;
            if (userNameNode) {
                userNameNode.textContent = displayName;
            }
            if (userEmailNode) {
                userEmailNode.textContent = emailText;
            }
            if (userAvatarFallback) {
                userAvatarFallback.textContent = getInitials(displayName);
            }
            if (userAvatarImage && userAvatarFallback) {
                if (photoUrl) {
                    userAvatarImage.src = photoUrl;
                    userAvatarImage.hidden = false;
                    userAvatarFallback.hidden = true;
                } else {
                    userAvatarImage.hidden = true;
                    userAvatarImage.removeAttribute("src");
                    userAvatarFallback.hidden = false;
                }
            }
            var profileNode = profileLink.querySelector("span");
            if (profileNode) {
                profileNode.textContent = profileLabel;
            }
            var bibleNode = bibleLink.querySelector("span");
            if (bibleNode) {
                bibleNode.textContent = bibleLabel;
            }
            var labelNode = songbookLink.querySelector("span");
            if (labelNode) {
                labelNode.textContent = songbookLabel;
            }
            var bookShelfNode = bookShelfLink.querySelector("span");
            if (bookShelfNode) {
                bookShelfNode.textContent = bookShelfLabel;
            }
            var kidsNode = kidsLink.querySelector("span");
            if (kidsNode) {
                kidsNode.textContent = kidsLabel;
            }
            var dailyBreadNode = dailyBreadMenuLink.querySelector("span");
            if (dailyBreadNode) {
                dailyBreadNode.textContent = dailyBreadMenuLabel;
            }
            var triviaNode = triviaLink.querySelector("span");
            if (triviaNode) {
                triviaNode.textContent = triviaLabel;
            }
            var achievementsNode = achievementsLink.querySelector("span");
            if (achievementsNode) {
                achievementsNode.textContent = achievementsLabel;
            }
            var chatNode = chatLink.querySelector("span");
            if (chatNode) {
                chatNode.textContent = chatLabel;
            }
            var settingsNode = settingsLink.querySelector("span");
            if (settingsNode) {
                settingsNode.textContent = settingsLabel;
            }
            var celebrationsNode = celebrationsLink.querySelector("span");
            if (celebrationsNode) {
                celebrationsNode.textContent = celebrationsLabel;
            }
            var mailboxNode = mailboxLink.querySelector("span");
            if (mailboxNode) {
                mailboxNode.textContent = mailboxLabel;
            }
            var adminNode = adminLink.querySelector("span");
            if (adminNode) {
                adminNode.textContent = adminLabel;
            }
            var authNode = authButton.querySelector("span");
            if (authNode) {
                authNode.textContent = authLabel;
            }
            var authIcon = authButton.querySelector("i");
            if (authIcon) {
                authIcon.className = "fa-solid " + authIconClass;
            }
            var contactMenuNode = contactMenuLink.querySelector("span");
            if (contactMenuNode) {
                contactMenuNode.textContent = contactMenuLabel;
            }
            applyModuleNavVisibility();
            refreshMenuQuickPrefs();
            var currentRoute = getCurrentRoute();
            var isProfile = getCurrentRoute() === "profile";
            var isBible = getCurrentRoute() === "bible";
            var isSongbook = getCurrentRoute() === "songbook";
            var isBookShelf = getCurrentRoute() === "book-shelf";
            var isKids = getCurrentRoute() === "kids";
            var isDailyBread = getCurrentRoute() === "daily-bread";
            var isTrivia = getCurrentRoute() === "trivia";
            var isAchievements = getCurrentRoute() === "user-achievements";
            var isChat = getCurrentRoute() === "chat";
            var isSettings = getCurrentRoute() === "settings";
            var isCelebrations = getCurrentRoute() === "celebrations";
            var isMailbox = getCurrentRoute() === "mailbox";
            var isAdminRoute = getCurrentRoute() === "admin";
            var isContact = getCurrentRoute() === "contact";
            profileLink.classList.toggle("active", isProfile);
            bibleLink.classList.toggle("active", isBible);
            songbookLink.classList.toggle("active", isSongbook);
            bookShelfLink.classList.toggle("active", isBookShelf);
            kidsLink.classList.toggle("active", isKids);
            dailyBreadMenuLink.classList.toggle("active", isDailyBread);
            triviaLink.classList.toggle("active", isTrivia);
            achievementsLink.classList.toggle("active", isAchievements);
            chatLink.classList.toggle("active", isChat);
            settingsLink.classList.toggle("active", isSettings);
            celebrationsLink.classList.toggle("active", isCelebrations);
            mailboxLink.classList.toggle("active", isMailbox);
            adminLink.classList.toggle("active", isAdminRoute);
            contactMenuLink.classList.toggle("active", isContact);
            mailboxLink.hidden = !isAdmin;
            adminLink.hidden = !isAdmin;
            renderNotificationCenter();
        }

        function positionPanel() {
            return;
        }

        function positionNotificationCenter() {
            if (notificationCenter.hidden) {
                return;
            }
            var anchor = notificationsButton || button;
            var rect = anchor.getBoundingClientRect();
            var desiredWidth = Math.min(320, window.innerWidth - 20);
            var left = rect.right - desiredWidth;
            if (left < 10) {
                left = 10;
            }
            if (left + desiredWidth > window.innerWidth - 10) {
                left = window.innerWidth - desiredWidth - 10;
            }
            notificationCenter.style.width = desiredWidth + "px";
            notificationCenter.style.left = left + "px";
            notificationCenter.style.top = (rect.bottom + 8) + "px";
        }

        function closePanel() {
            panel.hidden = true;
            backdrop.hidden = true;
            document.body.classList.remove("header-menu-open");
            button.setAttribute("aria-expanded", "false");
        }

        function closeNotificationCenter() {
            notificationCenter.hidden = true;
            notificationsButton.setAttribute("aria-expanded", "false");
        }

        function togglePanel(event) {
            if (event) {
                event.stopPropagation();
            }
            if (panel.hidden) {
                setLabels();
                panel.hidden = false;
                backdrop.hidden = false;
                document.body.classList.add("header-menu-open");
                button.setAttribute("aria-expanded", "true");
                positionPanel();
            } else {
                closePanel();
            }
            closeNotificationCenter();
        }

        setLabels();
        button.setAttribute("aria-haspopup", "dialog");
        button.setAttribute("aria-expanded", "false");
        notificationsButton.setAttribute("aria-haspopup", "dialog");
        notificationsButton.setAttribute("aria-expanded", "false");

        button.addEventListener("click", togglePanel);
        panelClose.addEventListener("click", function (event) {
            event.stopPropagation();
            closePanel();
        });
        backdrop.addEventListener("click", function () {
            closePanel();
        });
        panel.addEventListener("click", function (event) {
            event.stopPropagation();
            var link = event.target.closest("a[href]");
            if (link) {
                closePanel();
            }
        });
        notificationsButton.addEventListener("click", function (event) {
            event.stopPropagation();
            closePanel();
            renderNotificationCenter();
            if (notificationCenter.hidden) {
                notificationCenter.hidden = false;
                notificationsButton.setAttribute("aria-expanded", "true");
                positionNotificationCenter();
            } else {
                closeNotificationCenter();
            }
        });
        notificationCenter.addEventListener("click", function (event) {
            event.stopPropagation();
            var itemButton = event.target.closest("button[data-notification-id]");
            if (!itemButton) {
                return;
            }
            var notificationId = itemButton.getAttribute("data-notification-id") || "";
            var route = itemButton.getAttribute("data-notification-url") || "#home";
            var api = getInAppApi();
            if (api && typeof api.markRead === "function") {
                api.markRead(notificationId);
            }
            closeNotificationCenter();
            if (route.charAt(0) === "#") {
                window.location.hash = route;
            } else {
                window.location.href = route;
            }
        });
        if (notificationCenterMarkAll) {
            notificationCenterMarkAll.addEventListener("click", function (event) {
                event.stopPropagation();
                var api = getInAppApi();
                if (api && typeof api.markAllRead === "function") {
                    api.markAllRead();
                }
                renderNotificationCenter();
            });
        }
        if (notificationCenterClearRead) {
            notificationCenterClearRead.addEventListener("click", function (event) {
                event.stopPropagation();
                var api = getInAppApi();
                if (api && typeof api.clearRead === "function") {
                    api.clearRead();
                }
                renderNotificationCenter();
            });
        }
        authButton.addEventListener("click", function (event) {
            event.stopPropagation();
            closePanel();
            closeNotificationCenter();
            if (!window.NjcAuth) {
                return;
            }
            var activeUser = typeof window.NjcAuth.getUser === "function" ? window.NjcAuth.getUser() : null;
            if (activeUser && activeUser.uid && typeof window.NjcAuth.signOut === "function") {
                window.NjcAuth.signOut();
                return;
            }
            if (typeof window.NjcAuth.openAuthModal === "function") {
                window.NjcAuth.openAuthModal("login");
            }
        });

        document.addEventListener("click", function (event) {
            if (!panel.hidden && !panel.contains(event.target) && !button.contains(event.target)) {
                closePanel();
            }
            if (!notificationCenter.hidden && !notificationCenter.contains(event.target) && !notificationsButton.contains(event.target)) {
                closeNotificationCenter();
            }
        });
        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape") {
                closePanel();
                closeNotificationCenter();
            }
        });
        window.addEventListener("resize", function () {
            positionPanel();
            positionNotificationCenter();
        });
        function scrollEventOriginatedInside(el, container) {
            if (!container || !el) {
                return false;
            }
            if (el === container) {
                return true;
            }
            if (el.nodeType === 1 && typeof el.closest === "function" && el.closest("#" + container.id)) {
                return true;
            }
            try {
                return container.contains(el);
            } catch (err) {
                return false;
            }
        }

        window.addEventListener("scroll", function (event) {
            var target = event.target;
            if (!panel.hidden && !scrollEventOriginatedInside(target, panel)) {
                closePanel();
            }
            if (!notificationCenter.hidden && !scrollEventOriginatedInside(target, notificationCenter)) {
                closeNotificationCenter();
            }
        }, true);
        window.addEventListener("hashchange", function () {
            closePanel();
            closeNotificationCenter();
            setLabels();
        });
        document.addEventListener("njc:langchange", function () {
            setLabels();
            refreshMenuQuickPrefs();
            positionPanel();
            positionNotificationCenter();
        });
        document.addEventListener("njc:authchange", function () {
            setLabels();
            refreshMenuQuickPrefs();
            positionPanel();
            positionNotificationCenter();
        });
        document.addEventListener("njc:modules-updated", function () {
            setLabels();
        });
        document.addEventListener("njc:profile-updated", function () {
            setLabels();
        });
        document.addEventListener("njc:inapp-notifications-updated", function () {
            renderNotificationCenter();
        });
        document.addEventListener("njc:themechange", function () {
            refreshMenuQuickPrefs();
        });
        refreshMenuQuickPrefs();
    }

    function setupSettingsPage() {
        var controls = document.getElementById("settings-card-controls");
        if (!controls) {
            return;
        }

        var languageButton = document.getElementById("language-toggle-btn");
        if (!languageButton) {
            languageButton = document.createElement("button");
            languageButton.id = "language-toggle-btn";
            languageButton.className = "lang-toggle";
            languageButton.type = "button";
            languageButton.textContent = activeLanguage === "ta" ? "EN" : "TA";
            languageButton.setAttribute("aria-label", activeLanguage === "ta"
                ? t("toggle.language.toEnglish", "Switch language to English")
                : t("toggle.language.toTamil", "Switch language to Tamil"));
            languageButton.addEventListener("click", function () {
                var next = activeLanguage === "ta" ? "en" : "ta";
                setLanguage(next, true, true);
            });
            document.addEventListener("njc:langchange", function () {
                languageButton.textContent = activeLanguage === "ta" ? "EN" : "TA";
                languageButton.setAttribute("aria-label", activeLanguage === "ta"
                    ? t("toggle.language.toEnglish", "Switch language to English")
                    : t("toggle.language.toTamil", "Switch language to Tamil"));
            });
        }
        var themeButton = document.getElementById("theme-toggle-btn");
        var notifyButton = document.getElementById("notification-quick-btn");
        if (!languageButton && !themeButton && !notifyButton) {
            return;
        }

        function getThemeStateLabel() {
            var isDark = (document.documentElement.getAttribute("data-theme") || "light") === "dark";
            return isDark
                ? t("settings.themeDark", "Dark mode")
                : t("settings.themeLight", "Light mode");
        }

        function getLanguageStateLabel() {
            return activeLanguage === "ta"
                ? t("settings.languageTamil", "Tamil")
                : t("settings.languageEnglish", "English");
        }

        function getNotificationsStateLabel() {
            if (!window.NjcNotifications || typeof window.NjcNotifications.getStatus !== "function") {
                return t("settings.notificationsUnsupported", "Not supported");
            }
            var status = window.NjcNotifications.getStatus();
            if (!status || !status.supported || status.permission === "unsupported") {
                return t("settings.notificationsUnsupported", "Not supported");
            }
            if (status.permission === "denied") {
                return t("settings.notificationsBlocked", "Blocked");
            }
            return status.enabled
                ? t("settings.notificationsOn", "On")
                : t("settings.notificationsOff", "Off");
        }

        function createSettingsItem(button, titleKey, titleFallback, getStateLabel) {
            if (!button) {
                return null;
            }
            var item = document.createElement("div");
            item.className = "settings-control-item";
            var copy = document.createElement("div");
            copy.className = "settings-control-copy";
            var title = document.createElement("strong");
            title.className = "settings-control-title";
            var state = document.createElement("span");
            state.className = "settings-control-state";
            copy.appendChild(title);
            copy.appendChild(state);
            item.appendChild(button);
            item.appendChild(copy);

            function refresh() {
                title.textContent = t(titleKey, titleFallback);
                var stateValue = typeof getStateLabel === "function" ? getStateLabel() : "";
                state.textContent = stateValue;
                state.hidden = !stateValue;
            }

            item.addEventListener("click", function (event) {
                if (event.target === button || button.contains(event.target)) {
                    return;
                }
                button.click();
            });

            return {
                node: item,
                refresh: refresh
            };
        }

        controls.innerHTML = "";
        var items = [];
        if (themeButton) {
            var themeItem = createSettingsItem(themeButton, "settings.themeMode", "Light / dark", getThemeStateLabel);
            if (themeItem) {
                controls.appendChild(themeItem.node);
                items.push(themeItem);
            }
        }
        var paletteRow = document.createElement("div");
        paletteRow.className = "settings-palette-row";
        var paletteLabel = document.createElement("span");
        paletteLabel.className = "settings-palette-label";
        paletteLabel.setAttribute("data-i18n", "settings.themeColor");
        paletteLabel.textContent = t("settings.themeColor", "Color theme");
        var paletteHint = document.createElement("p");
        paletteHint.className = "settings-palette-hint page-note";
        paletteHint.setAttribute("data-i18n", "settings.themeColorHint");
        paletteHint.textContent = t("settings.themeColorHint", "Change accent and background colors (brightness is above).");
        var paletteSelect = document.createElement("select");
        paletteSelect.id = "settings-palette-select";
        paletteSelect.className = "settings-palette-select";
        paletteSelect.setAttribute("aria-label", t("settings.themeColor", "Color theme"));
        THEME_PALETTES.forEach(function (p) {
            var opt = document.createElement("option");
            opt.value = p.id;
            opt.textContent = t(p.key, p.fallback);
            paletteSelect.appendChild(opt);
        });
        paletteSelect.value = getActivePalette();
        paletteSelect.addEventListener("change", function () {
            var next = String(paletteSelect.value || "default");
            applyThemePalette(next);
            persistThemePalette(next);
            document.dispatchEvent(new CustomEvent("njc:themepalettechange", { detail: { palette: next } }));
        });
        paletteRow.appendChild(paletteLabel);
        paletteRow.appendChild(paletteHint);
        paletteRow.appendChild(paletteSelect);
        controls.appendChild(paletteRow);
        var paletteItem = {
            refresh: function () {
                paletteLabel.textContent = t("settings.themeColor", "Color theme");
                paletteHint.textContent = t("settings.themeColorHint", "Change accent and background colors (brightness is above).");
                paletteSelect.setAttribute("aria-label", t("settings.themeColor", "Color theme"));
                for (var i = 0; i < paletteSelect.options.length; i += 1) {
                    var o = paletteSelect.options[i];
                    var pid = o.value;
                    for (var j = 0; j < THEME_PALETTES.length; j += 1) {
                        if (THEME_PALETTES[j].id === pid) {
                            o.textContent = t(THEME_PALETTES[j].key, THEME_PALETTES[j].fallback);
                            break;
                        }
                    }
                }
                var cur = getActivePalette();
                if (paletteSelect.value !== cur) {
                    paletteSelect.value = cur;
                }
            }
        };
        items.push(paletteItem);
        if (languageButton) {
            var languageItem = createSettingsItem(languageButton, "settings.language", "Language", getLanguageStateLabel);
            if (languageItem) {
                controls.appendChild(languageItem.node);
                items.push(languageItem);
            }
        }
        if (notifyButton) {
            var notifyItem = createSettingsItem(notifyButton, "settings.notifications", "Notifications", getNotificationsStateLabel);
            if (notifyItem) {
                controls.appendChild(notifyItem.node);
                items.push(notifyItem);
            }
        }

        var LARGER_TEXT_KEY = "njc_larger_text_v1";
        function getLargerText() {
            try {
                return window.localStorage.getItem(LARGER_TEXT_KEY) === "1";
            } catch (e) { return false; }
        }
        function setLargerText(on) {
            try {
                window.localStorage.setItem(LARGER_TEXT_KEY, on ? "1" : "0");
            } catch (e) {}
            document.documentElement.setAttribute("data-larger-text", on ? "1" : "0");
        }
        var largerTextBtn = document.createElement("button");
        largerTextBtn.id = "settings-larger-text-btn";
        largerTextBtn.className = "lang-toggle";
        largerTextBtn.type = "button";
        largerTextBtn.setAttribute("aria-label", t("settings.largerText", "Larger text"));
        largerTextBtn.innerHTML = "<i class=\"fa-solid fa-text-height\" aria-hidden=\"true\"></i>";
        var largerTextItem = createSettingsItem(largerTextBtn, "settings.largerText", "Larger text", function () {
            return getLargerText() ? t("settings.largerTextOn", "On") : t("settings.largerTextOff", "Off");
        });
        largerTextBtn.addEventListener("click", function () {
            setLargerText(!getLargerText());
            refreshSettingsItems();
        });
        if (largerTextItem) {
            controls.appendChild(largerTextItem.node);
            items.push(largerTextItem);
        }
        setLargerText(getLargerText());

        var EN_FONT_OPTIONS = [
            { value: "inter", key: "settings.fontEnInter", fallback: "Inter (default)" },
            { value: "dm", key: "settings.fontEnDmSans", fallback: "DM Sans" },
            { value: "source", key: "settings.fontEnSourceSans", fallback: "Source Sans 3" },
            { value: "open", key: "settings.fontEnOpenSans", fallback: "Open Sans" },
            { value: "lato", key: "settings.fontEnLato", fallback: "Lato" },
            { value: "system", key: "settings.fontEnSystem", fallback: "System / device font" }
        ];
        var TA_FONT_OPTIONS = [
            { value: "noto", key: "settings.fontTaNoto", fallback: "Noto Sans Tamil (default)" },
            { value: "mukta", key: "settings.fontTaMuktaMalar", fallback: "Mukta Malar" },
            { value: "hind", key: "settings.fontTaHindMadurai", fallback: "Hind Madurai" },
            { value: "catamaran", key: "settings.fontTaCatamaran", fallback: "Catamaran" },
            { value: "system", key: "settings.fontTaSystem", fallback: "System Tamil fonts" }
        ];

        var fontBody = document.createElement("div");
        fontBody.className = "settings-font-section-body";
        var fontPanelOpen = getFontPanelOpenStored();
        fontBody.hidden = !fontPanelOpen;

        var fontToggleBtn = document.createElement("button");
        fontToggleBtn.type = "button";
        fontToggleBtn.id = "settings-font-toggle-btn";
        fontToggleBtn.className = "lang-toggle";
        fontToggleBtn.innerHTML = "<i class=\"fa-solid fa-font\" aria-hidden=\"true\"></i>";
        fontToggleBtn.setAttribute("aria-expanded", fontPanelOpen ? "true" : "false");
        fontToggleBtn.setAttribute("aria-label", t("settings.fonts", "Fonts"));

        function getFontPanelStateLabel() {
            return fontBody.hidden
                ? t("settings.fontsClosed", "Closed")
                : t("settings.fontsOpen", "Open");
        }

        fontToggleBtn.addEventListener("click", function () {
            var next = fontBody.hidden;
            fontBody.hidden = !next;
            persistFontPanelOpen(next);
            fontToggleBtn.setAttribute("aria-expanded", next ? "true" : "false");
            refreshSettingsItems();
        });

        var fontItem = createSettingsItem(fontToggleBtn, "settings.fonts", "Fonts", getFontPanelStateLabel);
        if (fontItem) {
            controls.appendChild(fontItem.node);
            items.push(fontItem);
        }
        document.addEventListener("njc:langchange", function () {
            fontToggleBtn.setAttribute("aria-label", t("settings.fonts", "Fonts"));
        });

        var fontSection = document.createElement("div");
        fontSection.className = "settings-font-section";
        fontSection.appendChild(fontBody);

        function fillFontSelect(select, options, current) {
            select.innerHTML = "";
            options.forEach(function (optDef) {
                var opt = document.createElement("option");
                opt.value = optDef.value;
                opt.setAttribute("data-i18n", optDef.key);
                opt.setAttribute("data-i18n-fallback", optDef.fallback);
                opt.textContent = t(optDef.key, optDef.fallback);
                select.appendChild(opt);
            });
            select.value = current;
        }

        var enRow = document.createElement("div");
        enRow.className = "settings-font-row";
        var enLabel = document.createElement("label");
        enLabel.className = "settings-font-label";
        enLabel.setAttribute("for", "settings-font-en");
        enLabel.setAttribute("data-i18n", "settings.fontEnglish");
        enLabel.setAttribute("data-i18n-fallback", "English text");
        var enSelect = document.createElement("select");
        enSelect.id = "settings-font-en";
        enSelect.className = "search-input settings-font-select";
        fillFontSelect(enSelect, EN_FONT_OPTIONS, getStoredFontEn());
        enSelect.addEventListener("change", function () {
            var v = normalizeFontPreset(FONT_PRESETS_EN, enSelect.value, "inter");
            persistFontEn(v);
            applyFontVariables(v, getStoredFontTa());
        });
        enRow.appendChild(enLabel);
        enRow.appendChild(enSelect);
        fontBody.appendChild(enRow);

        var taRow = document.createElement("div");
        taRow.className = "settings-font-row";
        var taLabel = document.createElement("label");
        taLabel.className = "settings-font-label";
        taLabel.setAttribute("for", "settings-font-ta");
        taLabel.setAttribute("data-i18n", "settings.fontTamil");
        taLabel.setAttribute("data-i18n-fallback", "Tamil text");
        var taSelect = document.createElement("select");
        taSelect.id = "settings-font-ta";
        taSelect.className = "search-input settings-font-select";
        fillFontSelect(taSelect, TA_FONT_OPTIONS, getStoredFontTa());
        taSelect.addEventListener("change", function () {
            var v = normalizeFontPreset(FONT_PRESETS_TA, taSelect.value, "noto");
            persistFontTa(v);
            applyFontVariables(getStoredFontEn(), v);
        });
        taRow.appendChild(taLabel);
        taRow.appendChild(taSelect);
        fontBody.appendChild(taRow);

        var prevEn = document.createElement("div");
        prevEn.className = "settings-font-preview-block";
        var prevEnCap = document.createElement("p");
        prevEnCap.className = "page-note settings-font-preview-caption";
        prevEnCap.setAttribute("data-i18n", "settings.fontPreviewEn");
        prevEnCap.setAttribute("data-i18n-fallback", "Preview (English)");
        var prevEnText = document.createElement("p");
        prevEnText.className = "settings-font-preview-sample settings-font-preview-en";
        prevEnText.setAttribute("lang", "en");
        prevEnText.textContent = "The Lord is my shepherd; I shall not want. — Psalm 23";
        prevEn.appendChild(prevEnCap);
        prevEn.appendChild(prevEnText);
        fontBody.appendChild(prevEn);

        var prevTa = document.createElement("div");
        prevTa.className = "settings-font-preview-block";
        var prevTaCap = document.createElement("p");
        prevTaCap.className = "page-note settings-font-preview-caption";
        prevTaCap.setAttribute("data-i18n", "settings.fontPreviewTa");
        prevTaCap.setAttribute("data-i18n-fallback", "Preview (Tamil)");
        var prevTaText = document.createElement("p");
        prevTaText.className = "settings-font-preview-sample settings-font-preview-ta";
        prevTaText.setAttribute("lang", "ta");
        prevTaText.textContent = "கர்த்தர் என் மேய்ப்பர், எனக்கு குறைவுண்டாகாது.";
        prevTa.appendChild(prevTaCap);
        prevTa.appendChild(prevTaText);
        fontBody.appendChild(prevTa);

        controls.appendChild(fontSection);

        if ("serviceWorker" in navigator) {
            var updateBtn = document.createElement("button");
            updateBtn.id = "settings-update-btn";
            updateBtn.className = "settings-update-btn";
            updateBtn.type = "button";
            updateBtn.setAttribute("aria-label", t("settings.checkForUpdates", "Check for updates"));
            updateBtn.innerHTML = "<i class=\"fa-solid fa-arrows-rotate\" aria-hidden=\"true\"></i>";
            var updateStatus = document.createElement("span");
            updateStatus.className = "settings-control-state settings-update-status";
            updateStatus.setAttribute("aria-live", "polite");
            updateStatus.hidden = true;
            var updateItem = document.createElement("div");
            updateItem.className = "settings-control-item";
            var updateCopy = document.createElement("div");
            updateCopy.className = "settings-control-copy";
            var updateTitle = document.createElement("strong");
            updateTitle.className = "settings-control-title";
            updateTitle.textContent = t("settings.checkForUpdates", "Check for updates");
            updateCopy.appendChild(updateTitle);
            updateCopy.appendChild(updateStatus);
            updateItem.appendChild(updateBtn);
            updateItem.appendChild(updateCopy);
            updateBtn.addEventListener("click", function () {
                updateStatus.textContent = t("settings.updateChecking", "Checking...");
                updateStatus.hidden = false;
                navigator.serviceWorker.getRegistration().then(function (reg) {
                    if (!reg) {
                        updateStatus.textContent = t("settings.updateError", "Could not check.");
                        return;
                    }
                    reg.update().then(function () {
                        if (reg.waiting || reg.installing) {
                            updateStatus.textContent = t("settings.updateAvailable", "New version available!");
                            tryShowUpdateModal(reg, { fromSettings: true });
                        } else {
                            updateStatus.textContent = t("settings.updateUpToDate", "You're up to date.");
                        }
                        var tmid = setTimeout(function () {
                            updateStatus.textContent = "";
                            updateStatus.hidden = true;
                        }, 5000);
                        updateStatus._clearStatus = function () {
                            clearTimeout(tmid);
                            updateStatus.textContent = "";
                            updateStatus.hidden = true;
                        };
                    }).catch(function () {
                        updateStatus.textContent = t("settings.updateError", "Could not check.");
                    });
                }).catch(function () {
                    updateStatus.textContent = t("settings.updateError", "Could not check.");
                });
            });
            document.addEventListener("njc:langchange", function () {
                updateTitle.textContent = t("settings.checkForUpdates", "Check for updates");
                updateBtn.setAttribute("aria-label", t("settings.checkForUpdates", "Check for updates"));
            });
            controls.appendChild(updateItem);
        }

        var versionNote = document.getElementById("settings-version-note");
        var versionValue = document.getElementById("settings-version-value");
        if (versionValue) {
            versionValue.textContent = APP_VERSION;
        }

        function refreshSettingsItems() {
            items.forEach(function (item) {
                if (item && typeof item.refresh === "function") {
                    item.refresh();
                }
            });
        }
        refreshSettingsItems();

        var headerControls = document.querySelector(".app-header .header-controls");
        if (headerControls && headerControls.children.length === 0) {
            headerControls.remove();
        }

        document.addEventListener("njc:langchange", refreshSettingsItems);
        document.addEventListener("njc:themechange", refreshSettingsItems);
        document.addEventListener("njc:themepalettechange", refreshSettingsItems);
        document.addEventListener("njc:notificationstatus", refreshSettingsItems);
        document.addEventListener("njc:inapp-notifications-updated", refreshSettingsItems);
    }

    function setupOfflineBadge() {
        var existing = document.getElementById("offline-badge");
        if (existing) {
            existing.remove();
        }

        var badge = document.createElement("div");
        badge.id = "offline-badge";
        badge.className = "offline-badge";
        badge.textContent = t("offline.active", "Offline mode active");
        badge.hidden = navigator.onLine;
        document.body.appendChild(badge);

        function refresh() {
            badge.hidden = navigator.onLine;
        }

        window.addEventListener("online", refresh);
        window.addEventListener("offline", refresh);
        document.addEventListener("njc:langchange", function () {
            badge.textContent = t("offline.active", "Offline mode active");
        });
    }

    function getStoredState() {
        try {
            var raw = window.localStorage.getItem(STATE_KEY);
            if (!raw) {
                return null;
            }
            var parsed = JSON.parse(raw);
            if (!parsed || !parsed.audioUrl) {
                return null;
            }
            return parsed;
        } catch (err) {
            return null;
        }
    }

    function setStoredState(state) {
        try {
            window.localStorage.setItem(STATE_KEY, JSON.stringify(state));
        } catch (err) {
            return null;
        }
        return null;
    }

    function clearStoredState() {
        try {
            window.localStorage.removeItem(STATE_KEY);
        } catch (err) {
            return null;
        }
        return null;
    }

    function formatTime(seconds) {
        if (!Number.isFinite(seconds) || seconds < 0) {
            return "00:00";
        }
        var mins = Math.floor(seconds / 60);
        var secs = Math.floor(seconds % 60);
        return mins + ":" + (secs < 10 ? "0" + secs : String(secs));
    }

    function createGlobalMiniPlayer() {
        if (document.getElementById("global-mini-player")) {
            return;
        }

        if (document.getElementById("sermon-audio")) {
            return;
        }

        var state = getStoredState();
        if (!state || !state.audioUrl) {
            return;
        }

        var container = document.createElement("div");
        container.id = "global-mini-player";
        container.className = "mini-sermon-player";

        var openButton = document.createElement("button");
        openButton.type = "button";
        openButton.className = "mini-player-open";
        openButton.setAttribute("aria-label", t("player.openSermonsPage", "Open sermons page"));

        var titleNode = document.createElement("span");
        titleNode.className = "mini-player-title";
        titleNode.textContent = state.title || t("sermons.nowPlaying", "Now Playing");
        openButton.appendChild(titleNode);

        var timeNode = document.createElement("span");
        timeNode.className = "mini-player-time";
        timeNode.textContent = "00:00 / 00:00";
        openButton.appendChild(timeNode);

        var playButton = document.createElement("button");
        playButton.type = "button";
        playButton.className = "mini-player-btn";
        playButton.setAttribute("aria-label", t("player.playOrPause", "Play or pause"));
        playButton.innerHTML = "<i class=\"fa-solid fa-play\"></i>";

        var closeButton = document.createElement("button");
        closeButton.type = "button";
        closeButton.className = "mini-player-btn";
        closeButton.setAttribute("aria-label", t("player.stopAndClose", "Stop and close player"));
        closeButton.innerHTML = "<i class=\"fa-solid fa-xmark\"></i>";

        container.appendChild(openButton);
        container.appendChild(playButton);
        container.appendChild(closeButton);
        document.body.appendChild(container);

        var audio = new Audio();
        audio.preload = "metadata";
        audio.src = state.audioUrl;

        function saveState() {
            setStoredState({
                audioUrl: audio.currentSrc || state.audioUrl,
                title: titleNode.textContent,
                subtitle: state.subtitle || "",
                speaker: state.speaker || "",
                dateText: state.dateText || "",
                currentTime: audio.currentTime || 0,
                isPlaying: !audio.paused
            });
        }

        function refreshMini() {
            var current = audio.currentTime || 0;
            var duration = audio.duration || 0;
            timeNode.textContent = formatTime(current) + " / " + formatTime(duration);
            var icon = audio.paused ? "fa-play" : "fa-pause";
            playButton.innerHTML = "<i class=\"fa-solid " + icon + "\"></i>";
        }

        audio.addEventListener("loadedmetadata", function () {
            if (Number.isFinite(state.currentTime) && state.currentTime > 0) {
                try {
                    audio.currentTime = Math.min(state.currentTime, audio.duration || state.currentTime);
                } catch (err) {
                    return null;
                }
            }
            refreshMini();
        });

        audio.addEventListener("timeupdate", function () {
            refreshMini();
            saveState();
        });

        audio.addEventListener("play", function () {
            refreshMini();
            saveState();
        });

        audio.addEventListener("pause", function () {
            refreshMini();
            saveState();
        });

        audio.addEventListener("ended", function () {
            refreshMini();
            saveState();
        });

        openButton.addEventListener("click", function () {
            window.location.href = "#sermons";
        });

        playButton.addEventListener("click", function () {
            if (audio.paused) {
                audio.play().catch(function () {
                    return null;
                });
            } else {
                audio.pause();
            }
        });

        closeButton.addEventListener("click", function () {
            audio.pause();
            clearStoredState();
            container.remove();
        });

        document.addEventListener("njc:langchange", function () {
            openButton.setAttribute("aria-label", t("player.openSermonsPage", "Open sermons page"));
            playButton.setAttribute("aria-label", t("player.playOrPause", "Play or pause"));
            closeButton.setAttribute("aria-label", t("player.stopAndClose", "Stop and close player"));
            if (!state.title) {
                titleNode.textContent = t("sermons.nowPlaying", "Now Playing");
            }
        });

        if (state.isPlaying) {
            audio.play().catch(function () {
                refreshMini();
                saveState();
            });
        } else {
            refreshMini();
        }
    }

    function getStoredTheme() {
        try {
            var value = window.localStorage.getItem(THEME_KEY);
            if (value === "light" || value === "dark") {
                return value;
            }
        } catch (err) {
            return null;
        }
        return null;
    }

    var THEME_PALETTES = [
        { id: "default", key: "settings.paletteDefault", fallback: "Classic (red & white)" },
        { id: "ocean", key: "settings.paletteOcean", fallback: "Ocean (teal)" },
        { id: "forest", key: "settings.paletteForest", fallback: "Forest (green)" },
        { id: "sunset", key: "settings.paletteSunset", fallback: "Sunset (amber)" },
        { id: "slate", key: "settings.paletteSlate", fallback: "Slate (blue-gray)" }
    ];

    function getStoredPalette() {
        try {
            var v = window.localStorage.getItem(THEME_PALETTE_KEY);
            if (v) {
                for (var i = 0; i < THEME_PALETTES.length; i += 1) {
                    if (THEME_PALETTES[i].id === v) {
                        return v;
                    }
                }
            }
        } catch (e) {
            return null;
        }
        return null;
    }

    function getActivePalette() {
        return getStoredPalette() || "default";
    }

    function applyThemePalette(paletteId) {
        var id = String(paletteId || "default");
        var ok = false;
        for (var i = 0; i < THEME_PALETTES.length; i += 1) {
            if (THEME_PALETTES[i].id === id) {
                ok = true;
                break;
            }
        }
        if (!ok) {
            id = "default";
        }
        if (id === "default") {
            document.documentElement.removeAttribute("data-theme-palette");
        } else {
            document.documentElement.setAttribute("data-theme-palette", id);
        }
    }

    function persistThemePalette(paletteId) {
        var id = String(paletteId || "default");
        var ok = false;
        for (var j = 0; j < THEME_PALETTES.length; j += 1) {
            if (THEME_PALETTES[j].id === id) {
                ok = true;
                break;
            }
        }
        if (!ok) {
            id = "default";
        }
        try {
            if (id === "default") {
                window.localStorage.removeItem(THEME_PALETTE_KEY);
            } else {
                window.localStorage.setItem(THEME_PALETTE_KEY, id);
            }
        } catch (err) {
            return null;
        }
        return null;
    }

    function getSystemTheme() {
        return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }

    function getActiveTheme() {
        return getStoredTheme() || getSystemTheme();
    }

    function applyTheme(theme) {
        document.documentElement.setAttribute("data-theme", theme);
    }

    function persistTheme(theme) {
        try {
            window.localStorage.setItem(THEME_KEY, theme);
        } catch (err) {
            return null;
        }
        return null;
    }

    function setToggleIcon(button, theme) {
        var icon = theme === "dark" ? "fa-sun" : "fa-moon";
        var label = theme === "dark"
            ? t("toggle.theme.toLight", "Switch to light mode")
            : t("toggle.theme.toDark", "Switch to dark mode");
        button.innerHTML = "<i class=\"fa-solid " + icon + "\"></i>";
        button.setAttribute("aria-label", label);
        button.title = label;
    }

    function setupThemeToggle() {
        if (document.getElementById("theme-toggle-btn")) {
            return;
        }

        var sink = document.getElementById("njc-settings-btn-sink");
        if (!sink) {
            sink = document.createElement("div");
            sink.id = "njc-settings-btn-sink";
            sink.className = "njc-settings-btn-sink";
            sink.hidden = true;
            sink.setAttribute("aria-hidden", "true");
            document.body.appendChild(sink);
        }

        var button = document.createElement("button");
        button.id = "theme-toggle-btn";
        button.className = "theme-toggle";
        button.type = "button";

        var activeTheme = getActiveTheme();
        applyTheme(activeTheme);
        applyThemePalette(getActivePalette());
        setToggleIcon(button, activeTheme);

        button.addEventListener("click", function () {
            var nextTheme = (document.documentElement.getAttribute("data-theme") === "dark") ? "light" : "dark";
            applyTheme(nextTheme);
            persistTheme(nextTheme);
            setToggleIcon(button, nextTheme);
            document.dispatchEvent(new CustomEvent("njc:themechange", { detail: { theme: nextTheme } }));
        });

        sink.appendChild(button);

        var media = window.matchMedia("(prefers-color-scheme: dark)");
        if (media && media.addEventListener) {
            media.addEventListener("change", function () {
                if (!getStoredTheme()) {
                    var systemTheme = getSystemTheme();
                    applyTheme(systemTheme);
                    setToggleIcon(button, systemTheme);
                    document.dispatchEvent(new CustomEvent("njc:themechange", { detail: { theme: systemTheme } }));
                }
            });
        }

        document.addEventListener("njc:langchange", function () {
            setToggleIcon(button, document.documentElement.getAttribute("data-theme") || getActiveTheme());
        });
    }

    function showSplashScreenOnce() {
        var launchedFromInstalledApp = false;
        try {
            launchedFromInstalledApp = Boolean(
                (window.matchMedia && (
                    window.matchMedia("(display-mode: standalone)").matches ||
                    window.matchMedia("(display-mode: fullscreen)").matches ||
                    window.matchMedia("(display-mode: minimal-ui)").matches
                )) ||
                window.navigator.standalone === true ||
                String(document.referrer || "").indexOf("android-app://") === 0
            );
        } catch (err) {
            launchedFromInstalledApp = false;
        }
        if (launchedFromInstalledApp) {
            return;
        }

        try {
            if (window.sessionStorage.getItem(SPLASH_KEY)) {
                return;
            }
            window.sessionStorage.setItem(SPLASH_KEY, "1");
        } catch (err) {
            return;
        }

        var splash = document.createElement("div");
        splash.className = "splash-screen startup-static";
        splash.innerHTML = "" +
            "<div class=\"splash-inner\">" +
            "  <img class=\"splash-logo\" src=\"logo.png\" alt=\"New Jerusalem Church Belgium logo\">" +
            "</div>";

        document.body.appendChild(splash);
        document.body.classList.add("splash-active");

        requestAnimationFrame(function () {
            splash.classList.add("show");
        });

        window.setTimeout(function () {
            splash.classList.remove("show");
            splash.classList.add("hide");
            document.body.classList.remove("splash-active");
            window.setTimeout(function () {
                splash.remove();
            }, 320);
        }, 2600);
    }

    window.NjcUiFeedback = (function () {
        function prefersReducedMotion() {
            try {
                return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            } catch (e) {
                return false;
            }
        }

        function lightHaptic(style) {
            if (prefersReducedMotion()) {
                return;
            }
            try {
                var nav = window.navigator;
                if (nav && nav.vibrate) {
                    if (style === "success") {
                        nav.vibrate([12, 40, 18]);
                    } else {
                        nav.vibrate(10);
                    }
                }
            } catch (e2) {}
        }

        function playSoftTone(freqHz, durationSec, volume) {
            if (prefersReducedMotion()) {
                return;
            }
            try {
                var Ctx = window.AudioContext || window.webkitAudioContext;
                if (!Ctx) {
                    return;
                }
                var ctx = new Ctx();
                var osc = ctx.createOscillator();
                var gain = ctx.createGain();
                osc.type = "sine";
                osc.connect(gain);
                gain.connect(ctx.destination);
                var v = Math.min(0.22, Math.max(0.02, Number(volume) || 0.08));
                var dur = Math.min(0.5, Math.max(0.04, Number(durationSec) || 0.12));
                osc.frequency.setValueAtTime(Number(freqHz) || 440, ctx.currentTime);
                gain.gain.setValueAtTime(v, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + dur + 0.02);
            } catch (e3) {}
        }

        function celebrateSuccess() {
            lightHaptic("success");
            playSoftTone(523.25, 0.08, 0.1);
            window.setTimeout(function () {
                playSoftTone(659.25, 0.08, 0.09);
            }, 70);
            window.setTimeout(function () {
                playSoftTone(783.99, 0.1, 0.08);
            }, 140);
        }

        function readingCheckIn() {
            lightHaptic("light");
            playSoftTone(440, 0.06, 0.06);
        }

        return {
            celebrateSuccess: celebrateSuccess,
            readingCheckIn: readingCheckIn,
            prefersReducedMotion: prefersReducedMotion
        };
    })();

    document.addEventListener("DOMContentLoaded", function () {
        registerServiceWorker();
        setupOfflineBanner();
        setupPwaInstallBanner();
        activeLanguage = getActiveLanguage();
        try {
            var lt = window.localStorage.getItem("njc_larger_text_v1") === "1";
            document.documentElement.setAttribute("data-larger-text", lt ? "1" : "0");
        } catch (e) {}
        applyFontVariables(getStoredFontEn(), getStoredFontTa());
        window.NjcI18n = {
            t: t,
            tForElement: tForElement,
            getLanguage: function () {
                return activeLanguage;
            },
            getLanguageForElement: getLanguageForElement,
            getLocale: getLocale,
            getLocaleForElement: getLocaleForElement,
            setLanguage: function (language) {
                setLanguage(language, true, true);
            },
            apply: applyTranslations,
            formatCount: translateCountText
        };

        window.NjcAchievementBoard = (function () {
            var COL = "userAchievementScores";
            var TRIVIA_KEY = "njc_trivia_points_v1";
            var READING_KEY = "njc_reading_points_v1";
            var PROFILES_KEY = "njc_user_profiles_v1";

            function looksLikeEmail(text) {
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(text || "").trim());
            }

            function pickDisplayName(uid, user) {
                try {
                    var raw = window.localStorage.getItem(PROFILES_KEY);
                    var map = raw ? JSON.parse(raw) : {};
                    if (map && typeof map === "object") {
                        var p = map[uid];
                        if (p && p.leaderboardAnonymous) {
                            return "Anonymous";
                        }
                        var name = p && String(p.fullName || "").trim();
                        if (name) {
                            return name.slice(0, 80);
                        }
                    }
                } catch (e1) {}
                var dn = user && String(user.displayName || "").trim();
                if (dn && !looksLikeEmail(dn)) {
                    return dn.slice(0, 80);
                }
                var em = user && user.email;
                if (em) {
                    var local = String(em).split("@")[0].replace(/[._-]+/g, " ").trim();
                    if (local) {
                        return local.slice(0, 80);
                    }
                }
                return "Member";
            }

            function sanitizeGroupId(raw) {
                var s = String(raw || "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
                return s.slice(0, 40);
            }

            function readProfileGroupId(uid) {
                try {
                    var map = JSON.parse(window.localStorage.getItem(PROFILES_KEY) || "{}");
                    var p = map && map[uid];
                    return sanitizeGroupId(p && p.groupId);
                } catch (e) {
                    return "";
                }
            }

            function syncMyPublicScore() {
                var authApi = window.NjcAuth;
                var user = authApi && typeof authApi.getUser === "function" ? authApi.getUser() : null;
                if (!user || !user.uid) {
                    return Promise.resolve(null);
                }
                if (!window.firebase || !window.firebase.apps || !window.firebase.apps.length) {
                    return Promise.resolve(null);
                }
                var uid = String(user.uid);
                var tid = "u:" + uid;
                var trivia = 0;
                var reading = 0;
                try {
                    var tmap = JSON.parse(window.localStorage.getItem(TRIVIA_KEY) || "{}");
                    trivia = Number(tmap[tid]) || 0;
                } catch (e2) {}
                try {
                    var rmap = JSON.parse(window.localStorage.getItem(READING_KEY) || "{}");
                    reading = Number(rmap[tid]) || 0;
                } catch (e3) {}
                var total = trivia + reading;
                var displayName = pickDisplayName(uid, user);
                var groupId = readProfileGroupId(uid);
                try {
                    var ref = window.firebase.firestore().collection(COL).doc(uid);
                    var payload = {
                        displayName: displayName,
                        triviaPoints: trivia,
                        readingPoints: reading,
                        totalPoints: total,
                        updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
                        lastActiveAt: window.firebase.firestore.FieldValue.serverTimestamp(),
                        groupId: groupId || window.firebase.firestore.FieldValue.delete()
                    };
                    return ref.set(payload, { merge: true }).then(function () {
                        return true;
                    }).catch(function () {
                        return null;
                    });
                } catch (e4) {
                    return Promise.resolve(null);
                }
            }

            return { syncMyPublicScore: syncMyPublicScore };
        })();

        setLanguage(activeLanguage, false, true);
        if (window.NjcAuth && typeof window.NjcAuth.init === "function") {
            window.NjcAuth.init();
        }
        if (window.NjcCommunityCelebrations && typeof window.NjcCommunityCelebrations.ensureListen === "function") {
            window.NjcCommunityCelebrations.ensureListen();
        }
        setupThemeToggle();
        setupNotifications();
        setupNotificationQuickButton();
        setupSettingsPage();
        setupHeaderHamburgerMenu();
        setupCardLanguageSwitchers();
        setupOfflineBadge();
        showSplashScreenOnce();
        setupTabPrefetch();
        setupIntentPrefetch();
        createGlobalMiniPlayer();
    });
})();
