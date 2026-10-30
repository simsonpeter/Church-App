(function () {
    "use strict";

    var root = document.getElementById("kids-v2-root");
    if (!root) {
        return;
    }

    var STORAGE_KEY = "njc_kids_world_progress_v2";
    var LEGACY_STARS_KEY = "njc_kids_stars_v1";
    var PROFILE_KEY = "njc_user_profiles_v1";
    var BREAK_AFTER_MS = 20 * 60 * 1000;

    var memoryThemes = {
        noah: ["🌧️", "🌈", "🛶", "🕊️", "🐘", "🦒", "🐑", "🐢", "🦁", "🍃"],
        creation: ["☀️", "🌙", "⭐", "🌊", "🌳", "🐟", "🐦", "🦁", "🌸", "🌍"],
        david: ["🐑", "🎵", "🪕", "🪨", "🛡️", "👑", "🏕️", "⭐", "🙏", "🦁"],
        miracles: ["🍞", "🐟", "🛶", "🌊", "💧", "👁️", "🌿", "🧺", "❤️", "✨"],
        fruit: ["❤️", "😊", "🕊️", "⏳", "🤝", "🌱", "🙏", "🌻", "💛", "✨"]
    };

    /* Text is from the public-domain King James Version. */
    var verses = {
        easy: [
            { ref: "Psalm 23:1 (KJV)", chunks: ["The LORD", "is my shepherd;", "I shall not want."] },
            { ref: "Psalm 56:3 (KJV)", chunks: ["What time", "I am afraid,", "I will trust", "in thee."] },
            { ref: "Genesis 1:1 (KJV)", chunks: ["In the beginning", "God created", "the heaven", "and the earth."] }
        ],
        medium: [
            { ref: "Psalm 119:105 (KJV)", chunks: ["Thy word is", "a lamp unto my feet,", "and a light", "unto my path."] },
            { ref: "Philippians 4:13 (KJV)", chunks: ["I can do", "all things", "through Christ", "which strengtheneth me."] },
            { ref: "Proverbs 3:5 (KJV)", chunks: ["Trust in the LORD", "with all thine heart;", "and lean not", "unto thine own understanding."] }
        ],
        hard: [
            { ref: "Ephesians 4:32 (KJV)", chunks: ["And be ye kind", "one to another,", "tenderhearted,", "forgiving one another,", "even as God", "for Christ's sake", "hath forgiven you."] },
            { ref: "Matthew 5:16 (KJV)", chunks: ["Let your light", "so shine before men,", "that they may see", "your good works,", "and glorify your Father", "which is in heaven."] },
            { ref: "John 3:16 (KJV)", chunks: ["For God so loved the world,", "that he gave", "his only begotten Son,", "that whosoever believeth in him", "should not perish,", "but have everlasting life."] }
        ]
    };

    function question(text, choices, answer, reference, explanation) {
        return { text: text, choices: choices, answer: answer, reference: reference, explanation: explanation };
    }

    var worlds = [
        { id: "creation", icon: "🌍", name: "Creation", questions: [
            question("What did God create on the first day?", ["Light", "Animals", "People"], 0, "Genesis 1:3–5", "God spoke light into the darkness and called it day."),
            question("Who were the first man and woman?", ["Abraham and Sarah", "Adam and Eve", "Joseph and Mary"], 1, "Genesis 2:7, 22", "God formed Adam and made Eve to be with him."),
            question("On which day did God rest?", ["The third day", "The sixth day", "The seventh day"], 2, "Genesis 2:2–3", "After completing creation, God blessed the seventh day and rested.")
        ]},
        { id: "noah", icon: "🌈", name: "Noah's Ark", questions: [
            question("Why did Noah build the ark?", ["God told him to", "He wanted a fishing boat", "A king ordered it"], 0, "Genesis 6:13–22", "Noah trusted God and followed His instructions."),
            question("What sign did God place in the clouds after the flood?", ["A star", "A rainbow", "A crown"], 1, "Genesis 9:12–17", "The rainbow was the sign of God’s covenant."),
            question("Which bird returned with an olive leaf?", ["A dove", "An eagle", "A sparrow"], 0, "Genesis 8:10–11", "The olive leaf showed Noah that the waters were going down.")
        ]},
        { id: "abraham", icon: "✨", name: "Abraham and Sarah", questions: [
            question("What did God tell Abraham to count as a picture of his future family?", ["Sandwiches", "Stars", "Sheep"], 1, "Genesis 15:5", "God promised Abraham descendants as countless as the stars."),
            question("What was the name of Abraham and Sarah’s promised son?", ["Isaac", "Ishmael", "Jacob"], 0, "Genesis 21:1–3", "Sarah gave birth to Isaac just as God had promised."),
            question("How old was Abraham when Isaac was born?", ["50", "75", "100"], 2, "Genesis 21:5", "Abraham was one hundred years old when Isaac was born.")
        ]},
        { id: "joseph", icon: "🧥", name: "Joseph", questions: [
            question("What special gift did Joseph receive from his father?", ["A coat", "A harp", "A boat"], 0, "Genesis 37:3", "Jacob gave Joseph a special coat."),
            question("What did Joseph explain for Pharaoh?", ["A map", "Dreams", "A song"], 1, "Genesis 41:14–36", "God helped Joseph explain Pharaoh’s dreams about coming years."),
            question("Did Joseph forgive the brothers who had hurt him?", ["Yes", "No", "He never saw them"], 0, "Genesis 45:4–15", "Joseph forgave his brothers and cared for his family.")
        ]},
        { id: "moses", icon: "🌊", name: "Moses and Exodus", questions: [
            question("Where did God speak to Moses from a flame?", ["A burning bush", "A palace lamp", "A campfire"], 0, "Exodus 3:1–6", "The bush burned without being consumed."),
            question("What sea did God part for His people?", ["Sea of Galilee", "Red Sea", "Dead Sea"], 1, "Exodus 14:21–22", "God made a dry path through the Red Sea."),
            question("What food appeared on the ground in the wilderness?", ["Manna", "Grapes", "Fish"], 0, "Exodus 16:14–15", "God provided manna for His people to eat.")
        ]},
        { id: "apostles", icon: "🔥", name: "The Apostles", questions: [
            question("What happened when the Holy Spirit came at Pentecost?", ["The disciples spoke in other languages", "The temple disappeared", "Everyone fell asleep"], 0, "Acts 2:1–4", "The Holy Spirit filled the disciples and enabled them to speak in other languages."),
            question("Who preached after Pentecost, when about three thousand people believed?", ["Peter", "Thomas", "Matthew"], 0, "Acts 2:14, 41", "Peter explained the good news, and about three thousand people received it."),
            question("What did Paul and Silas do while they were in prison?", ["They prayed and sang praises", "They built a boat", "They wrote to Pharaoh"], 0, "Acts 16:25–26", "Paul and Silas prayed and sang to God before an earthquake opened the doors.")
        ]},
        { id: "david", icon: "🪨", name: "David and Goliath", questions: [
            question("What work did young David do?", ["He was a shepherd", "He was a sailor", "He was a baker"], 0, "1 Samuel 16:11", "David cared for his father’s sheep."),
            question("What did David use against Goliath?", ["A sling and a stone", "A chariot", "A bow and arrow"], 0, "1 Samuel 17:40, 49", "David trusted God and used his sling."),
            question("Whose name did David say he came in?", ["His own name", "The king’s name", "The LORD’s name"], 2, "1 Samuel 17:45", "David knew the battle belonged to the LORD.")
        ]},
        { id: "daniel", icon: "🦁", name: "Daniel and the Lions", questions: [
            question("How often did Daniel pray each day?", ["Once", "Three times", "Ten times"], 1, "Daniel 6:10", "Daniel continued praying three times a day."),
            question("Where was Daniel placed for praying to God?", ["A lions’ den", "A fiery furnace", "A prison ship"], 0, "Daniel 6:16", "The king ordered Daniel into the lions’ den."),
            question("Who shut the lions’ mouths?", ["Daniel’s friend", "The king", "God’s angel"], 2, "Daniel 6:22", "God sent His angel and kept Daniel safe.")
        ]},
        { id: "fruit", icon: "🍇", name: "Fruits of the Spirit", questions: [
            question("Which of these is a fruit of the Spirit?", ["Love", "Jealousy", "Pride"], 0, "Galatians 5:22–23", "Love is the first quality named in the fruit of the Spirit."),
            question("Which fruit helps us wait without giving up?", ["Patience", "Noise", "Speed"], 0, "Galatians 5:22–23", "Patience helps us wait and keep doing what is right."),
            question("How can we show kindness?", ["By helping someone", "By laughing at someone", "By refusing to share"], 0, "Galatians 5:22; Ephesians 4:32", "Kindness treats other people with care and looks for ways to help.")
        ]},
        { id: "birth", icon: "⭐", name: "Birth of Jesus", questions: [
            question("In what town was Jesus born?", ["Nazareth", "Bethlehem", "Jerusalem"], 1, "Luke 2:4–7", "Joseph and Mary went to Bethlehem, where Jesus was born."),
            question("Who heard the good news from angels in the fields?", ["Shepherds", "Fishermen", "Soldiers"], 0, "Luke 2:8–14", "Angels announced Jesus’ birth to nearby shepherds."),
            question("What guided the wise men?", ["A rainbow", "A star", "A cloud"], 1, "Matthew 2:1–10", "They followed the star until it stood over the place where Jesus was.")
        ]},
        { id: "miracles", icon: "🍞", name: "Miracles of Jesus", questions: [
            question("What did Jesus calm when His friends were afraid?", ["A storm", "A crowd", "A fire"], 0, "Mark 4:37–41", "Jesus spoke, and the wind and sea became calm."),
            question("What foods did Jesus multiply to feed thousands?", ["Bread and fish", "Rice and fruit", "Cheese and olives"], 0, "John 6:9–13", "Jesus blessed five loaves and two fish, and everyone ate."),
            question("Whom did Jesus call out of a tomb?", ["Lazarus", "Zacchaeus", "Bartimaeus"], 0, "John 11:43–44", "Jesus raised Lazarus after he had been in the tomb four days.")
        ]},
        { id: "resurrection", icon: "✝️", name: "Resurrection of Jesus", questions: [
            question("Why did the women go to Jesus’ tomb early on the first day of the week?", ["To bring prepared spices", "To hide there", "To meet the soldiers"], 0, "Luke 24:1", "The women brought spices they had prepared for Jesus’ body."),
            question("Who found Jesus’ tomb open early on the first day of the week?", ["Mary Magdalene", "Martha", "Elizabeth"], 0, "John 20:1", "Mary Magdalene came early and saw the stone moved away."),
            question("What joyful news did the angel give at the tomb?", ["Jesus is risen", "Jesus has moved away", "Come back next year"], 0, "Matthew 28:5–6", "Jesus had risen, just as He said.")
        ]}
    ];
    var requestedWorldOrder = ["creation", "noah", "abraham", "joseph", "moses", "david", "daniel", "birth", "miracles", "resurrection", "apostles", "fruit"];
    worlds.sort(function (a, b) {
        return requestedWorldOrder.indexOf(a.id) - requestedWorldOrder.indexOf(b.id);
    });

    var UI_TEXT = {
        en: {
            brand: "NJC Kids World", heroQuestion: "Ready for a Bible adventure?", heroBody: "Play, learn, and collect stars as you travel through God’s story.",
            hello: "Hello, explorer!", helloName: "Hello, {name}!", continueAdventure: "Continue Adventure", stars: "stars",
            sounds: "Sounds", music: "Music", rewards: "Rewards", collection: "My collection", badges: "Badges & rewards",
            choosePath: "Choose your path", playLearn: "Play & learn", journeyStart: "Your journey is just beginning.", worldsExplored: "{n} of 12 adventure worlds explored",
            memoryName: "Memory Match", memoryDesc: "Flip cards and find Bible pairs", verseName: "Verse Builder", verseDesc: "Put God’s Word in order",
            adventureName: "Adventure Quiz", adventureDesc: "Explore 12 Bible worlds", memoryKicker: "Flip • find • remember",
            verseKicker: "Read • build • remember", adventureKicker: "12 worlds • 36 questions", cards: "Cards", theme: "Theme",
            cards6: "6 cards", cards12: "12 cards", cards20: "20 cards", newGame: "New game", moves: "Moves: {n}", pairs: "Pairs: {n} / {total}",
            memoryStart: "Choose two cards to find a pair.", memoryMatch: "A match! Keep going.", memoryMiss: "Not a pair yet. Watch the cards!",
            memoryWin: "You matched them all!", memoryResult: "You found {pairs} pairs in {moves} moves.", playAgain: "Play again",
            noahTheme: "Noah's Ark", creationTheme: "Creation", davidTheme: "David and Goliath", miraclesTheme: "Jesus' Miracles", fruitTheme: "Fruits of the Spirit",
            easy: "Easy", medium: "Medium", hard: "Hard", verseInstruction: "Tap the word groups in the right order.", versePlaceholder: "Your verse will appear here…",
            hint: "Hint", reset: "Reset", check: "Check", next: "Next", tamilVerseTitle: "Tamil Verse Builder",
            tamilUnavailable: "Verified word-for-word Tamil verse text is not included in this release, so Verse Builder is available with English KJV text only.",
            switchEnglish: "Switch Kids World to English", englishAvailable: "English KJV is available.",
            hintReset: "Reset any out-of-order pieces, then try the hint.", hintNext: "This glowing piece comes next.",
            verseIncomplete: "Keep building — every word group needs a place.", verseAlmost: "Almost! Tap pieces to return them and try a different order.",
            verseCorrect: "Wonderful! You built {ref} correctly.", questionOf: "{current} / {total}", right: "That’s right!",
            goodTry: "Good try — here’s the answer.", readIt: "Read it: {ref}", seeStars: "See my stars", nextQuestion: "Next question",
            worldComplete: "World complete!", quizResult: "You answered {correct} of {total} questions correctly in {world}.",
            replayWorld: "Replay world", chooseWorld: "Choose a world", firstSteps: "First Steps", firstStepsHelp: "Earn 3 stars",
            matchMaster: "Match Master", matchMasterHelp: "Finish Memory Match", wordKeeper: "Word Keeper", wordKeeperHelp: "Build 3 verses",
            worldExplorer: "World Explorer", worldExplorerHelp: "Complete 4 worlds", breakTitle: "Explorer break!",
            breakBody: "You’ve been playing for a while. Stretch, blink, and look across the room.", gotIt: "Got it",
            classic: "Classic Activities", classicHelp: "All the original Kids World games", hiddenCard: "Hidden memory card", matched: "matched", revealed: "revealed",
            backDashboard: "Back to Kids dashboard", memoryGrid: "Memory Match cards", verseDifficulty: "Verse difficulty", yourVerse: "Your verse",
            verseParts: "Available verse parts", worldsLabel: "Bible adventure worlds", answersLabel: "Answer choices", chooseOther: "Choose another world",
            dismissBreak: "Dismiss break reminder", settingsRewards: "Kids World settings and rewards"
        },
        ta: {
            brand: "NJC சிறுவர் உலகம்", heroQuestion: "வேதாகமப் பயணத்திற்குத் தயாரா?", heroBody: "தேவனுடைய கதையில் பயணித்து விளையாடு, கற்றுக்கொள், நட்சத்திரங்களைச் சேகரி.",
            hello: "வணக்கம், சிறு பயணியே!", helloName: "வணக்கம், {name}!", continueAdventure: "பயணத்தைத் தொடரு", stars: "நட்சத்திரங்கள்",
            sounds: "ஒலிகள்", music: "இசை", rewards: "பரிசுகள்", collection: "என் சேகரிப்பு", badges: "பதக்கங்களும் பரிசுகளும்",
            choosePath: "உன் பாதையைத் தேர்ந்தெடு", playLearn: "விளையாடு & கற்றுக்கொள்", journeyStart: "உன் பயணம் இப்போதுதான் தொடங்குகிறது.", worldsExplored: "12 பயண உலகங்களில் {n} முடித்துள்ளாய்",
            memoryName: "நினைவுப் பொருத்தம்", memoryDesc: "அட்டைகளைத் திருப்பி வேதாகம ஜோடிகளைக் கண்டுபிடி", verseName: "வசன அமைப்பாளர்", verseDesc: "தேவனுடைய வார்த்தையை வரிசைப்படுத்து",
            adventureName: "சாகச வினாடி வினா", adventureDesc: "12 வேதாகம உலகங்களை ஆராய்", memoryKicker: "திருப்பு • கண்டுபிடி • நினைவில் கொள்",
            verseKicker: "வாசி • அமை • நினைவில் கொள்", adventureKicker: "12 உலகங்கள் • 36 கேள்விகள்", cards: "அட்டைகள்", theme: "தலைப்பு",
            cards6: "6 அட்டைகள்", cards12: "12 அட்டைகள்", cards20: "20 அட்டைகள்", newGame: "புதிய விளையாட்டு", moves: "முயற்சிகள்: {n}", pairs: "ஜோடிகள்: {n} / {total}",
            memoryStart: "ஒரு ஜோடியைக் கண்டுபிடிக்க இரண்டு அட்டைகளைத் தேர்ந்தெடு.", memoryMatch: "சரியான ஜோடி! தொடரு.", memoryMiss: "இன்னும் ஜோடி இல்லை. அட்டைகளைக் கவனி!",
            memoryWin: "எல்லா ஜோடிகளையும் கண்டுபிடித்தாய்!", memoryResult: "{moves} முயற்சிகளில் {pairs} ஜோடிகளைக் கண்டுபிடித்தாய்.", playAgain: "மீண்டும் விளையாடு",
            noahTheme: "நோவாவின் பேழை", creationTheme: "படைப்பு", davidTheme: "தாவீதும் கோலியாத்தும்", miraclesTheme: "இயேசுவின் அற்புதங்கள்", fruitTheme: "ஆவியின் கனிகள்",
            easy: "எளிது", medium: "நடுத்தரம்", hard: "கடினம்", verseInstruction: "சொல் தொகுதிகளைச் சரியான வரிசையில் தட்டு.", versePlaceholder: "உன் வசனம் இங்கே தோன்றும்…",
            hint: "குறிப்பு", reset: "மீட்டமை", check: "சரிபார்", next: "அடுத்து", tamilVerseTitle: "தமிழ் வசன அமைப்பாளர்",
            tamilUnavailable: "சொல்லுக்குச் சொல் சரிபார்க்கப்பட்ட தமிழ் வேதவசன உரை இந்த வெளியீட்டில் சேர்க்கப்படவில்லை. ஆகவே வசன அமைப்பாளர் தற்போது ஆங்கில KJV உரையில் மட்டுமே கிடைக்கிறது.",
            switchEnglish: "சிறுவர் உலகத்தை ஆங்கிலத்திற்கு மாற்று", englishAvailable: "ஆங்கில KJV கிடைக்கிறது.",
            hintReset: "தவறான வரிசையிலுள்ள பகுதிகளை மீட்டமைத்து, குறிப்பை மீண்டும் முயற்சி செய்.", hintNext: "ஒளிரும் பகுதி அடுத்து வருகிறது.",
            verseIncomplete: "தொடர்ந்து அமை — எல்லாச் சொல் தொகுதிகளுக்கும் இடம் தேவை.", verseAlmost: "கிட்டத்தட்ட சரி! பகுதிகளைத் திருப்பி வைத்து வேறு வரிசையில் முயற்சி செய்.",
            verseCorrect: "அருமை! {ref} வசனத்தைச் சரியாக அமைத்தாய்.", questionOf: "{current} / {total}", right: "சரியான பதில்!",
            goodTry: "நல்ல முயற்சி — சரியான பதிலைப் பார்ப்போம்.", readIt: "வாசிக்க: {ref}", seeStars: "என் நட்சத்திரங்கள்", nextQuestion: "அடுத்த கேள்வி",
            worldComplete: "உலகம் முடிந்தது!", quizResult: "{world} பகுதியில் {total} கேள்விகளில் {correct} சரியாகப் பதிலளித்தாய்.",
            replayWorld: "உலகத்தை மீண்டும் விளையாடு", chooseWorld: "ஓர் உலகைத் தேர்ந்தெடு", firstSteps: "முதல் அடிகள்", firstStepsHelp: "3 நட்சத்திரங்கள் பெறு",
            matchMaster: "பொருத்த வல்லவர்", matchMasterHelp: "நினைவுப் பொருத்தத்தை முடி", wordKeeper: "வார்த்தைக் காவலர்", wordKeeperHelp: "3 வசனங்களை அமை",
            worldExplorer: "உலகப் பயணி", worldExplorerHelp: "4 உலகங்களை முடி", breakTitle: "சிறு ஓய்வு!",
            breakBody: "நீ சிறிது நேரமாக விளையாடுகிறாய். உடலை நீட்டி, கண் சிமிட்டி, தூரத்தைப் பார்.", gotIt: "சரி",
            classic: "பழைய செயல்பாடுகள்", classicHelp: "சிறுவர் உலகத்தின் முந்தைய விளையாட்டுகள் அனைத்தும்", hiddenCard: "மறைந்த நினைவு அட்டை", matched: "பொருந்தியது", revealed: "திறந்தது",
            backDashboard: "சிறுவர் முகப்புக்குத் திரும்பு", memoryGrid: "நினைவுப் பொருத்த அட்டைகள்", verseDifficulty: "வசன நிலை", yourVerse: "உன் வசனம்",
            verseParts: "கிடைக்கும் வசனப் பகுதிகள்", worldsLabel: "வேதாகமப் பயண உலகங்கள்", answersLabel: "பதில் தேர்வுகள்", chooseOther: "வேறொரு உலகைத் தேர்ந்தெடு",
            dismissBreak: "ஓய்வு நினைவூட்டலை மூடு", settingsRewards: "சிறுவர் உலக அமைப்புகளும் பரிசுகளும்"
        }
    };

    var TAMIL_WORLDS = {
        creation: { name: "படைப்பு", q: [
            ["முதல் நாளில் தேவன் எதைப் படைத்தார்?", ["ஒளி", "விலங்குகள்", "மனிதர்கள்"], "தேவன் இருளில் ஒளி உண்டாகச் செய்து அதைப் பகல் என்று அழைத்தார்."],
            ["முதல் ஆணும் பெண்ணும் யார்?", ["ஆபிரகாமும் சாராளும்", "ஆதாமும் ஏவாளும்", "யோசேப்பும் மரியாளும்"], "தேவன் ஆதாமை உருவாக்கி, அவனுடன் இருக்க ஏவாளை உண்டாக்கினார்."],
            ["தேவன் எந்த நாளில் ஓய்ந்தார்?", ["மூன்றாம் நாள்", "ஆறாம் நாள்", "ஏழாம் நாள்"], "படைப்பை முடித்தபின் தேவன் ஏழாம் நாளை ஆசீர்வதித்து ஓய்ந்தார்."]
        ]},
        noah: { name: "நோவாவின் பேழை", q: [
            ["நோவா ஏன் பேழையைக் கட்டினார்?", ["தேவன் சொன்னதால்", "மீன்பிடிக்க விரும்பியதால்", "ஒரு ராஜா கட்டளையிட்டதால்"], "நோவா தேவனை நம்பி அவர் கொடுத்த வழிமுறைகளைப் பின்பற்றினார்."],
            ["வெள்ளத்திற்குப் பின் தேவன் மேகத்தில் வைத்த அடையாளம் எது?", ["நட்சத்திரம்", "வானவில்", "கிரீடம்"], "வானவில் தேவனுடைய உடன்படிக்கையின் அடையாளமாக இருந்தது."],
            ["ஒலிவ இலையுடன் திரும்பிய பறவை எது?", ["புறா", "கழுகு", "சிட்டுக்குருவி"], "ஒலிவ இலை தண்ணீர் குறைந்து வருவதை நோவாவுக்குக் காட்டியது."]
        ]},
        abraham: { name: "ஆபிரகாமும் சாராளும்", q: [
            ["தன் வருங்காலக் குடும்பத்தின் அடையாளமாக எதை எண்ணும்படி தேவன் ஆபிரகாமிடம் சொன்னார்?", ["உணவுகள்", "நட்சத்திரங்கள்", "ஆடுகள்"], "ஆபிரகாமின் சந்ததி நட்சத்திரங்களைப் போல எண்ணற்றதாக இருக்கும் என்று தேவன் வாக்குக் கொடுத்தார்."],
            ["ஆபிரகாமுக்கும் சாராளுக்கும் வாக்குத்தத்தமாகப் பிறந்த மகன் யார்?", ["ஈசாக்கு", "இஸ்மவேல்", "யாக்கோபு"], "தேவன் வாக்குக் கொடுத்தபடியே சாராள் ஈசாக்கைப் பெற்றாள்."],
            ["ஈசாக்கு பிறந்தபோது ஆபிரகாமுக்கு எத்தனை வயது?", ["50", "75", "100"], "ஈசாக்கு பிறந்தபோது ஆபிரகாமுக்கு நூறு வயது."]
        ]},
        joseph: { name: "யோசேப்பு", q: [
            ["யோசேப்பின் தந்தை அவருக்கு என்ன சிறப்புப் பரிசு கொடுத்தார்?", ["ஒரு அங்கி", "ஒரு யாழ்", "ஒரு படகு"], "யாக்கோபு யோசேப்புக்கு ஒரு சிறப்பு அங்கியைக் கொடுத்தார்."],
            ["பார்வோனுக்காக யோசேப்பு எதை விளக்கினார்?", ["ஒரு வரைபடம்", "கனவுகள்", "ஒரு பாடல்"], "வரவிருக்கும் ஆண்டுகளைப் பற்றிய பார்வோனின் கனவுகளை விளக்க தேவன் யோசேப்புக்கு உதவினார்."],
            ["தன்னைத் துன்புறுத்திய சகோதரர்களை யோசேப்பு மன்னித்தாரா?", ["ஆம்", "இல்லை", "அவர்களை மீண்டும் பார்க்கவில்லை"], "யோசேப்பு தன் சகோதரர்களை மன்னித்து குடும்பத்தைப் பராமரித்தார்."]
        ]},
        moses: { name: "மோசேயும் யாத்திராகமமும்", q: [
            ["தேவன் எதிலிருந்து மோசேயிடம் பேசினார்?", ["எரியும் முட்செடி", "அரண்மனை விளக்கு", "முகாம் நெருப்பு"], "முட்செடி எரிந்தும் அழியாமல் இருந்தது."],
            ["தேவன் தமது மக்களுக்காக எந்தக் கடலைப் பிரித்தார்?", ["கலிலேயா கடல்", "செங்கடல்", "சவக்கடல்"], "தேவன் செங்கடலின் நடுவே உலர்ந்த பாதையை ஏற்படுத்தினார்."],
            ["வனாந்தரத்தில் தரையில் தோன்றிய உணவு எது?", ["மன்னா", "திராட்சை", "மீன்"], "தேவன் தமது மக்களுக்கு உணவாக மன்னாவைக் கொடுத்தார்."]
        ]},
        david: { name: "தாவீதும் கோலியாத்தும்", q: [
            ["இளம் தாவீது என்ன வேலை செய்தார்?", ["மேய்ப்பனாக இருந்தார்", "மாலுமியாக இருந்தார்", "அப்பம் சுடுபவராக இருந்தார்"], "தாவீது தன் தந்தையின் ஆடுகளைப் பராமரித்தார்."],
            ["கோலியாத்துக்கு எதிராக தாவீது எதைப் பயன்படுத்தினார்?", ["கவணும் கல்லும்", "ஒரு தேர்", "வில் அம்பு"], "தாவீது தேவனை நம்பி தனது கவணைப் பயன்படுத்தினார்."],
            ["தான் யாருடைய நாமத்தில் வருவதாக தாவீது சொன்னார்?", ["தன் பெயரில்", "ராஜாவின் பெயரில்", "கர்த்தருடைய நாமத்தில்"], "யுத்தம் கர்த்தருடையது என்பதை தாவீது அறிந்திருந்தார்."]
        ]},
        daniel: { name: "தானியேலும் சிங்கங்களும்", q: [
            ["தானியேல் ஒவ்வொரு நாளும் எத்தனை முறை ஜெபித்தார்?", ["ஒரு முறை", "மூன்று முறை", "பத்து முறை"], "தானியேல் தினமும் மூன்று முறை தொடர்ந்து ஜெபித்தார்."],
            ["தேவனிடம் ஜெபித்ததால் தானியேல் எங்கே போடப்பட்டார்?", ["சிங்கங்களின் குகை", "அக்கினிச் சூளை", "சிறைக் கப்பல்"], "ராஜா தானியேலை சிங்கங்களின் குகையில் போடச் சொன்னார்."],
            ["சிங்கங்களின் வாயை மூடியவர் யார்?", ["தானியேலின் நண்பர்", "ராஜா", "தேவனுடைய தூதன்"], "தேவன் தமது தூதனை அனுப்பி தானியேலைப் பாதுகாத்தார்."]
        ]},
        birth: { name: "இயேசுவின் பிறப்பு", q: [
            ["இயேசு எந்த ஊரில் பிறந்தார்?", ["நாசரேத்", "பெத்லகேம்", "எருசலேம்"], "யோசேப்பும் மரியாளும் பெத்லகேமுக்குச் சென்றபோது இயேசு அங்கே பிறந்தார்."],
            ["வயல்வெளியில் தூதர்களிடமிருந்து நற்செய்தி கேட்டவர்கள் யார்?", ["மேய்ப்பர்கள்", "மீனவர்கள்", "படைவீரர்கள்"], "அருகிலிருந்த மேய்ப்பர்களுக்கு தூதர்கள் இயேசுவின் பிறப்பை அறிவித்தார்கள்."],
            ["ஞானிகளை வழிநடத்தியது எது?", ["வானவில்", "நட்சத்திரம்", "மேகம்"], "இயேசு இருந்த இடம்வரை அவர்கள் நட்சத்திரத்தைப் பின்தொடர்ந்தார்கள்."]
        ]},
        miracles: { name: "இயேசுவின் அற்புதங்கள்", q: [
            ["சீடர்கள் பயந்தபோது இயேசு எதை அமைதிப்படுத்தினார்?", ["புயல்", "கூட்டம்", "நெருப்பு"], "இயேசு கட்டளையிட்டதும் காற்றும் கடலும் அமைதியானது."],
            ["ஆயிரக்கணக்கானவர்களுக்கு உணவளிக்க இயேசு எவற்றைப் பெருகச் செய்தார்?", ["அப்பமும் மீனும்", "சோறும் பழமும்", "பாலாடையும் ஒலிவப்பழமும்"], "இயேசு ஐந்து அப்பங்களையும் இரண்டு மீன்களையும் ஆசீர்வதித்தார்; அனைவரும் சாப்பிட்டார்கள்."],
            ["கல்லறையிலிருந்து வெளியே வரும்படி இயேசு யாரை அழைத்தார்?", ["லாசரு", "சக்கேயு", "பர்திமேயு"], "நான்கு நாட்கள் கல்லறையில் இருந்த லாசருவை இயேசு உயிரோடு எழுப்பினார்."]
        ]},
        resurrection: { name: "இயேசுவின் உயிர்த்தெழுதல்", q: [
            ["வாரத்தின் முதல் நாள் அதிகாலையில் பெண்கள் ஏன் இயேசுவின் கல்லறைக்குச் சென்றார்கள்?", ["தயாரித்த வாசனைப் பொருட்களைக் கொண்டுசெல்ல", "அங்கே ஒளிந்துகொள்ள", "படைவீரர்களைச் சந்திக்க"], "இயேசுவின் உடலுக்காகத் தயாரித்த வாசனைப் பொருட்களை அவர்கள் கொண்டுசென்றார்கள்."],
            ["வாரத்தின் முதல் நாள் அதிகாலையில் இயேசுவின் கல்லறை திறந்திருப்பதை முதலில் கண்டவர் யார்?", ["மகதலேனா மரியாள்", "மார்த்தாள்", "எலிசபெத்து"], "மகதலேனா மரியாள் அதிகாலையில் வந்து கல் அகற்றப்பட்டிருப்பதைக் கண்டாள்."],
            ["கல்லறையில் தூதன் சொன்ன மகிழ்ச்சியான செய்தி என்ன?", ["இயேசு உயிர்த்தெழுந்தார்", "இயேசு வேறு இடத்திற்குச் சென்றார்", "அடுத்த ஆண்டு வாருங்கள்"], "இயேசு சொன்னபடியே உயிர்த்தெழுந்திருந்தார்."]
        ]},
        apostles: { name: "அப்போஸ்தலர்கள்", q: [
            ["பெந்தெகொஸ்தே நாளில் பரிசுத்த ஆவி வந்தபோது என்ன நடந்தது?", ["சீடர்கள் வேறு மொழிகளில் பேசினார்கள்", "ஆலயம் மறைந்தது", "எல்லோரும் தூங்கினார்கள்"], "பரிசுத்த ஆவி சீடர்களை நிரப்பி வேறு மொழிகளில் பேசச் செய்தார்."],
            ["பெந்தெகொஸ்தே நாளுக்குப் பின் யார் பிரசங்கித்தபோது ஏறக்குறைய மூவாயிரம் பேர் விசுவாசித்தார்கள்?", ["பேதுரு", "தோமா", "மத்தேயு"], "பேதுரு நற்செய்தியை விளக்கினார்; ஏறக்குறைய மூவாயிரம் பேர் அதை ஏற்றுக்கொண்டார்கள்."],
            ["சிறையில் இருந்தபோது பவுலும் சீலாவும் என்ன செய்தார்கள்?", ["ஜெபித்து தேவனைப் பாடினார்கள்", "படகு கட்டினார்கள்", "பார்வோனுக்கு எழுதினார்கள்"], "பவுலும் சீலாவும் ஜெபித்து தேவனைப் பாடினர்; பின்பு பூகம்பம் கதவுகளைத் திறந்தது."]
        ]},
        fruit: { name: "ஆவியின் கனிகள்", q: [
            ["இவற்றில் எது ஆவியின் கனி?", ["அன்பு", "பொறாமை", "பெருமை"], "ஆவியின் கனியில் முதலில் குறிப்பிடப்படும் பண்பு அன்பு."],
            ["கைவிடாமல் காத்திருக்க உதவும் கனி எது?", ["நீடிய பொறுமை", "சத்தம்", "வேகம்"], "நீடிய பொறுமை காத்திருக்கவும் சரியானதைத் தொடர்ந்து செய்யவும் உதவுகிறது."],
            ["தயவை நாம் எப்படிக் காட்டலாம்?", ["ஒருவருக்கு உதவுவதால்", "ஒருவரைப் பார்த்துச் சிரிப்பதால்", "பகிர மறுப்பதால்"], "தயவு மற்றவர்களை அக்கறையுடன் நடத்தி உதவும் வழிகளைத் தேடுகிறது."]
        ]}
    };

    function defaultProgress() {
        return {
            version: 2,
            totalStars: 0,
            legacyStarsImported: 0,
            memory: { games: 0, bestByThemeSize: {} },
            verse: { solved: {}, completed: 0 },
            adventure: { worlds: {} },
            settings: { sound: true, music: false },
            lastActivity: "adventure",
            updatedAt: 0
        };
    }

    function integer(value) {
        var n = parseInt(String(value || "0"), 10);
        return isFinite(n) && n > 0 ? n : 0;
    }

    function loadProgress() {
        var base = defaultProgress();
        try {
            var parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null");
            if (parsed && parsed.version === 2) {
                base.totalStars = integer(parsed.totalStars);
                base.legacyStarsImported = integer(parsed.legacyStarsImported);
                var oldMemory = parsed.memory && typeof parsed.memory === "object" ? parsed.memory : {};
                var oldVerse = parsed.verse && typeof parsed.verse === "object" ? parsed.verse : {};
                var oldAdventure = parsed.adventure && typeof parsed.adventure === "object" ? parsed.adventure : {};
                var oldSettings = parsed.settings && typeof parsed.settings === "object" ? parsed.settings : {};
                base.memory = {
                    games: integer(oldMemory.games),
                    bestByThemeSize: oldMemory.bestByThemeSize && typeof oldMemory.bestByThemeSize === "object"
                        ? oldMemory.bestByThemeSize
                        : {}
                };
                base.verse = {
                    solved: oldVerse.solved && typeof oldVerse.solved === "object" ? oldVerse.solved : {},
                    completed: integer(oldVerse.completed)
                };
                base.adventure = {
                    worlds: oldAdventure.worlds && typeof oldAdventure.worlds === "object" ? oldAdventure.worlds : {}
                };
                base.settings = {
                    sound: oldSettings.sound !== false,
                    music: oldSettings.music === true
                };
                base.lastActivity = /^(memory|verse|adventure)$/.test(parsed.lastActivity) ? parsed.lastActivity : "adventure";
            }
            var legacy = integer(window.localStorage.getItem(LEGACY_STARS_KEY));
            if (legacy > base.legacyStarsImported) {
                base.totalStars += legacy - base.legacyStarsImported;
                base.legacyStarsImported = legacy;
            }
        } catch (error) {
            return base;
        }
        return base;
    }

    var progress = loadProgress();

    function saveProgress() {
        progress.version = 2;
        progress.updatedAt = Date.now();
        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
        } catch (error) {
            return;
        }
    }

    function syncLegacyStars() {
        try {
            var legacy = integer(window.localStorage.getItem(LEGACY_STARS_KEY));
            if (legacy > progress.legacyStarsImported) {
                progress.totalStars += legacy - progress.legacyStarsImported;
                progress.legacyStarsImported = legacy;
                saveProgress();
            }
        } catch (error) {
            return;
        }
    }

    function byId(id) {
        return document.getElementById(id);
    }

    function shuffle(list) {
        var copy = list.slice();
        for (var i = copy.length - 1; i > 0; i -= 1) {
            var j = Math.floor(Math.random() * (i + 1));
            var swap = copy[i];
            copy[i] = copy[j];
            copy[j] = swap;
        }
        return copy;
    }

    function cardLanguage() {
        try {
            if (window.NjcI18n && typeof window.NjcI18n.getLanguageForElement === "function") {
                return window.NjcI18n.getLanguageForElement(root);
            }
        } catch (error) {
            return "en";
        }
        return document.documentElement.lang === "ta" ? "ta" : "en";
    }

    function tr(key, values) {
        var lang = cardLanguage() === "ta" ? "ta" : "en";
        var text = (UI_TEXT[lang] && UI_TEXT[lang][key]) || UI_TEXT.en[key] || key;
        Object.keys(values || {}).forEach(function (name) {
            text = text.replace(new RegExp("\\{" + name + "\\}", "g"), String(values[name]));
        });
        return text;
    }

    function setText(selector, key) {
        var node = root.querySelector(selector);
        if (node) {
            node.textContent = tr(key);
        }
    }

    function setLeadingLabel(selector, key) {
        var node = root.querySelector(selector);
        if (node && node.firstChild && node.firstChild.nodeType === 3) {
            node.firstChild.nodeValue = tr(key);
        }
    }

    function applyStaticLanguage() {
        [
            [".kids-v2-hero .kids-v2-kicker", "brand"], ["#kids-v2-hero-question", "heroQuestion"],
            [".kids-v2-hero-copy > p:not(.kids-v2-kicker)", "heroBody"], ["#kids-v2-continue", "continueAdventure"],
            ["#kids-v2-stars-label", "stars"], ["#kids-v2-sound span", "sounds"], ["#kids-v2-music span", "music"],
            ["#kids-v2-rewards-button span", "rewards"], ["#kids-v2-rewards .kids-v2-kicker", "collection"],
            ["#kids-v2-rewards-title", "badges"], ["#kids-v2-dashboard .kids-v2-kicker", "choosePath"],
            ["#kids-v2-play-title", "playLearn"], [".kids-v2-game-card--teal strong", "memoryName"],
            [".kids-v2-game-card--teal small", "memoryDesc"], [".kids-v2-game-card--purple strong", "verseName"],
            [".kids-v2-game-card--purple small", "verseDesc"], [".kids-v2-game-card--coral strong", "adventureName"],
            [".kids-v2-game-card--coral small", "adventureDesc"], ["#kids-v2-memory .kids-v2-kicker", "memoryKicker"],
            ["#kids-v2-memory-title", "memoryName"], ["#kids-v2-memory-new", "newGame"], ["#kids-v2-memory-result-title", "memoryWin"],
            ["#kids-v2-memory-retry", "playAgain"], ["#kids-v2-verse .kids-v2-kicker", "verseKicker"],
            ["#kids-v2-verse-title", "verseName"], ["#kids-v2-verse-difficulty [data-difficulty='easy']", "easy"],
            ["#kids-v2-verse-difficulty [data-difficulty='medium']", "medium"], ["#kids-v2-verse-difficulty [data-difficulty='hard']", "hard"],
            ["#kids-v2-verse-hint", "hint"], ["#kids-v2-verse-reset", "reset"], ["#kids-v2-verse-check", "check"],
            ["#kids-v2-verse-next", "next"], ["#kids-v2-verse-switch-en", "switchEnglish"],
            ["#kids-v2-adventure .kids-v2-kicker", "adventureKicker"], ["#kids-v2-adventure-title", "adventureName"],
            ["#kids-v2-quiz-result-title", "worldComplete"], ["#kids-v2-quiz-replay", "replayWorld"],
            ["#kids-v2-quiz-worlds", "chooseWorld"], ["#kids-v2-break strong", "breakTitle"],
            ["#kids-v2-break p", "breakBody"], ["#kids-v2-break-dismiss", "gotIt"],
            ["#kids-v2-classic summary strong", "classic"], ["#kids-v2-classic summary small", "classicHelp"]
        ].forEach(function (binding) { setText(binding[0], binding[1]); });
        setLeadingLabel("#kids-v2-memory .kids-v2-controls label:first-child", "cards");
        setLeadingLabel("#kids-v2-memory .kids-v2-controls label:nth-child(2)", "theme");
        [["6", "cards6"], ["12", "cards12"], ["20", "cards20"]].forEach(function (item) {
            var option = byId("kids-v2-memory-size").querySelector("option[value='" + item[0] + "']");
            if (option) { option.textContent = tr(item[1]); }
        });
        [["noah", "noahTheme"], ["creation", "creationTheme"], ["david", "davidTheme"], ["miracles", "miraclesTheme"], ["fruit", "fruitTheme"]].forEach(function (item) {
            var option = byId("kids-v2-memory-theme").querySelector("option[value='" + item[0] + "']");
            if (option) { option.textContent = tr(item[1]); }
        });
        root.querySelectorAll("[data-kids-v2-back]").forEach(function (button) { button.setAttribute("aria-label", tr("backDashboard")); });
        root.querySelector(".kids-v2-utility").setAttribute("aria-label", tr("settingsRewards"));
        byId("kids-v2-memory-grid").setAttribute("aria-label", tr("memoryGrid"));
        byId("kids-v2-verse-difficulty").setAttribute("aria-label", tr("verseDifficulty"));
        byId("kids-v2-verse-answer").setAttribute("aria-label", tr("yourVerse"));
        byId("kids-v2-verse-bank").setAttribute("aria-label", tr("verseParts"));
        byId("kids-v2-world-grid").setAttribute("aria-label", tr("worldsLabel"));
        byId("kids-v2-quiz-answers").setAttribute("aria-label", tr("answersLabel"));
        byId("kids-v2-worlds-back").setAttribute("aria-label", tr("chooseOther"));
        byId("kids-v2-break-dismiss").setAttribute("aria-label", tr("dismissBreak"));
        updateGreeting();
    }

    function getName() {
        var user = window.NjcAuth && typeof window.NjcAuth.getUser === "function" ? window.NjcAuth.getUser() : null;
        var profile = {};
        try {
            var profiles = JSON.parse(window.localStorage.getItem(PROFILE_KEY) || "{}");
            profile = user && profiles && profiles[user.uid] ? profiles[user.uid] : {};
        } catch (error) {
            profile = {};
        }
        var full = String((profile && profile.fullName) || (user && user.displayName) || "").trim();
        if (!full && user && user.email) {
            full = String(user.email).split("@")[0].replace(/[._-]+/g, " ");
        }
        return full ? full.split(/\s+/)[0] : "";
    }

    function awardStars(amount) {
        progress.totalStars += Math.max(0, integer(amount));
        saveProgress();
        renderDashboard();
        tone("win");
    }

    var audioContext = null;
    var musicTimer = null;

    function ensureAudio() {
        if (!audioContext) {
            var AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                audioContext = new AudioContext();
            }
        }
        if (audioContext && audioContext.state === "suspended") {
            audioContext.resume().catch(function () {});
        }
        return audioContext;
    }

    function tone(kind) {
        if (!progress.settings.sound) {
            return;
        }
        var ctx = ensureAudio();
        if (!ctx) {
            return;
        }
        var frequencies = kind === "win" ? [523, 659, 784] : kind === "good" ? [440, 660] : kind === "bad" ? [220, 185] : [390];
        frequencies.forEach(function (frequency, index) {
            var oscillator = ctx.createOscillator();
            var gain = ctx.createGain();
            oscillator.type = "sine";
            oscillator.frequency.value = frequency;
            gain.gain.setValueAtTime(0.0001, ctx.currentTime + index * 0.09);
            gain.gain.exponentialRampToValueAtTime(0.055, ctx.currentTime + index * 0.09 + 0.015);
            gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + index * 0.09 + 0.16);
            oscillator.connect(gain);
            gain.connect(ctx.destination);
            oscillator.start(ctx.currentTime + index * 0.09);
            oscillator.stop(ctx.currentTime + index * 0.09 + 0.18);
        });
    }

    function stopMusic() {
        if (musicTimer) {
            window.clearInterval(musicTimer);
            musicTimer = null;
        }
    }

    function startMusic() {
        stopMusic();
        var notes = [261, 329, 392, 329];
        var index = 0;
        ensureAudio();
        function note() {
            if (!progress.settings.music || !audioContext) {
                return;
            }
            var oscillator = audioContext.createOscillator();
            var gain = audioContext.createGain();
            oscillator.type = "sine";
            oscillator.frequency.value = notes[index % notes.length];
            gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.018, audioContext.currentTime + 0.04);
            gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.6);
            oscillator.connect(gain);
            gain.connect(audioContext.destination);
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.62);
            index += 1;
        }
        note();
        musicTimer = window.setInterval(note, 900);
    }

    var badges = [
        { icon: "🌱", nameKey: "firstSteps", helpKey: "firstStepsHelp", test: function () { return progress.totalStars >= 3; } },
        { icon: "🧠", nameKey: "matchMaster", helpKey: "matchMasterHelp", test: function () { return integer(progress.memory.games) >= 1; } },
        { icon: "📖", nameKey: "wordKeeper", helpKey: "wordKeeperHelp", test: function () { return integer(progress.verse.completed) >= 3; } },
        { icon: "🗺️", nameKey: "worldExplorer", helpKey: "worldExplorerHelp", test: function () {
            return Object.keys(progress.adventure.worlds || {}).filter(function (id) { return integer(progress.adventure.worlds[id]) > 0; }).length >= 4;
        }}
    ];

    function renderDashboard() {
        syncLegacyStars();
        var starNode = byId("kids-v2-stars");
        if (starNode) {
            starNode.textContent = String(integer(progress.totalStars));
        }
        var completed = Object.keys(progress.adventure.worlds || {}).filter(function (id) {
            return integer(progress.adventure.worlds[id]) > 0;
        }).length;
        byId("kids-v2-progress-summary").textContent = completed
            ? tr("worldsExplored", { n: completed })
            : tr("journeyStart");
        var badgeGrid = byId("kids-v2-badge-grid");
        badgeGrid.innerHTML = "";
        badges.forEach(function (badge) {
            var item = document.createElement("div");
            item.className = "kids-v2-badge";
            item.setAttribute("aria-disabled", badge.test() ? "false" : "true");
            item.innerHTML = "<span aria-hidden=\"true\">" + badge.icon + "</span><div><strong>" + tr(badge.nameKey) + "</strong><small>" + tr(badge.helpKey) + "</small></div>";
            badgeGrid.appendChild(item);
        });
        renderWorlds();
    }

    function updateGreeting() {
        var name = getName();
        byId("kids-v2-greeting").textContent = name ? tr("helloName", { name: name }) : tr("hello");
    }

    function openExperience(name) {
        if (!/^(memory|verse|adventure)$/.test(name)) {
            name = "adventure";
        }
        byId("kids-v2-dashboard").hidden = true;
        root.querySelectorAll("[data-kids-v2-experience]").forEach(function (section) {
            section.hidden = section.getAttribute("data-kids-v2-experience") !== name;
        });
        progress.lastActivity = name;
        saveProgress();
        if (name === "memory" && !memoryState.deck.length) {
            startMemory();
        }
        if (name === "verse") {
            renderVerse();
        }
        if (name === "adventure") {
            showWorlds();
        }
        var target = byId("kids-v2-" + name + "-title");
        if (target) {
            target.focus({ preventScroll: true });
            target.closest(".kids-v2-experience").scrollIntoView({
                behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
                block: "start"
            });
        }
    }

    function showDashboard() {
        byId("kids-v2-dashboard").hidden = false;
        root.querySelectorAll("[data-kids-v2-experience]").forEach(function (section) { section.hidden = true; });
        renderDashboard();
        byId("kids-v2-play-title").focus({ preventScroll: true });
    }

    var memoryState = { deck: [], first: null, locked: false, moves: 0, pairs: 0, size: 12, theme: "noah", statusKey: "memoryStart" };

    function startMemory() {
        var size = integer(byId("kids-v2-memory-size").value) || 12;
        var theme = byId("kids-v2-memory-theme").value;
        var pairs = size / 2;
        var symbols = shuffle(memoryThemes[theme] || memoryThemes.creation).slice(0, pairs);
        memoryState = {
            deck: shuffle(symbols.concat(symbols).map(function (symbol, index) {
                return { symbol: symbol, key: symbol, id: index, open: false, matched: false };
            })),
            first: null,
            locked: false,
            moves: 0,
            pairs: 0,
            size: size,
            theme: theme,
            statusKey: "memoryStart"
        };
        byId("kids-v2-memory-result").hidden = true;
        renderMemory();
    }

    function renderMemory() {
        var grid = byId("kids-v2-memory-grid");
        grid.innerHTML = "";
        grid.setAttribute("data-size", String(memoryState.size));
        memoryState.deck.forEach(function (card, index) {
            var button = document.createElement("button");
            button.type = "button";
            button.className = "kids-v2-memory-card" + (card.open ? " is-open" : "") + (card.matched ? " is-matched" : "");
            button.setAttribute("role", "gridcell");
            button.setAttribute("data-card-index", String(index));
            button.setAttribute("aria-label", card.open || card.matched ? card.symbol + ", " + (card.matched ? tr("matched") : tr("revealed")) : tr("hiddenCard"));
            button.disabled = card.matched;
            button.innerHTML = "<span class=\"kids-v2-memory-card-inner\"><span class=\"kids-v2-memory-face kids-v2-memory-back\" aria-hidden=\"true\">?</span><span class=\"kids-v2-memory-face kids-v2-memory-front\" aria-hidden=\"true\">" + card.symbol + "</span></span>";
            grid.appendChild(button);
        });
        byId("kids-v2-memory-moves").textContent = tr("moves", { n: memoryState.moves });
        byId("kids-v2-memory-pairs").textContent = tr("pairs", { n: memoryState.pairs, total: memoryState.size / 2 });
        byId("kids-v2-memory-status").textContent = tr(memoryState.statusKey);
    }

    function chooseMemory(index) {
        var card = memoryState.deck[index];
        if (!card || card.open || card.matched || memoryState.locked) {
            return;
        }
        card.open = true;
        tone("tap");
        renderMemory();
        if (memoryState.first === null) {
            memoryState.first = index;
            return;
        }
        var firstIndex = memoryState.first;
        var first = memoryState.deck[firstIndex];
        memoryState.first = null;
        memoryState.moves += 1;
        if (first.key === card.key) {
            first.matched = true;
            card.matched = true;
            memoryState.pairs += 1;
            memoryState.statusKey = "memoryMatch";
            tone("good");
            renderMemory();
            if (memoryState.pairs === memoryState.size / 2) {
                finishMemory();
            }
            return;
        }
        memoryState.locked = true;
        memoryState.statusKey = "memoryMiss";
        tone("bad");
        renderMemory();
        window.setTimeout(function () {
            first.open = false;
            card.open = false;
            memoryState.locked = false;
            renderMemory();
        }, 720);
    }

    function finishMemory() {
        var pairs = memoryState.size / 2;
        var stars = memoryState.moves <= pairs + 2 ? 3 : memoryState.moves <= pairs * 2 ? 2 : 1;
        progress.memory.games = integer(progress.memory.games) + 1;
        var bestKey = memoryState.theme + ":" + String(memoryState.size);
        var previous = integer(progress.memory.bestByThemeSize[bestKey]);
        progress.memory.bestByThemeSize[bestKey] = Math.max(previous, stars);
        if (stars > previous) {
            awardStars(stars - previous);
        } else {
            saveProgress();
            tone("win");
        }
        byId("kids-v2-memory-result-copy").textContent = tr("memoryResult", { pairs: pairs, moves: memoryState.moves });
        byId("kids-v2-memory-result-stars").textContent = new Array(stars + 1).join("★") + new Array(4 - stars).join("☆");
        byId("kids-v2-memory-result").hidden = false;
        byId("kids-v2-memory-result").scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    var verseState = { difficulty: "easy", index: 0, available: [], answer: [], hints: 0, solved: false };

    function currentVerse() {
        return verses[verseState.difficulty][verseState.index % verses[verseState.difficulty].length];
    }

    function newVerse() {
        var item = currentVerse();
        verseState.available = shuffle(item.chunks.map(function (text, index) { return { text: text, order: index }; }));
        verseState.answer = [];
        verseState.hints = 0;
        verseState.solved = false;
        renderVerse();
    }

    function renderVerse() {
        var tamil = cardLanguage() === "ta";
        var item = currentVerse();
        byId("kids-v2-verse-reference").textContent = tamil ? tr("tamilVerseTitle") : item.ref;
        byId("kids-v2-verse-instruction").textContent = tamil ? tr("tamilUnavailable") : tr("verseInstruction");
        var switchButton = byId("kids-v2-verse-switch-en");
        var cardToggle = root.closest(".kids-page-card") && root.closest(".kids-page-card").querySelector(".card-lang-toggle");
        switchButton.hidden = !tamil || !cardToggle;
        switchButton.textContent = tr("switchEnglish");
        ["kids-v2-verse-hint", "kids-v2-verse-reset", "kids-v2-verse-check", "kids-v2-verse-next"].forEach(function (id) {
            byId(id).disabled = tamil;
        });
        var answer = byId("kids-v2-verse-answer");
        var bank = byId("kids-v2-verse-bank");
        answer.innerHTML = "";
        bank.innerHTML = "";
        if (tamil) {
            byId("kids-v2-verse-feedback").textContent = cardToggle ? "" : tr("englishAvailable");
            return;
        }
        verseState.answer.forEach(function (part, index) {
            answer.appendChild(makeVerseTile(part, "answer", index));
        });
        verseState.available.forEach(function (part, index) {
            bank.appendChild(makeVerseTile(part, "bank", index));
        });
        if (!verseState.answer.length) {
            var placeholder = document.createElement("span");
            placeholder.className = "kids-v2-verse-placeholder";
            placeholder.textContent = tr("versePlaceholder");
            answer.appendChild(placeholder);
        }
    }

    function makeVerseTile(part, source, index) {
        var button = document.createElement("button");
        button.type = "button";
        button.className = "kids-v2-word-tile";
        button.textContent = part.text;
        button.setAttribute("data-source", source);
        button.setAttribute("data-index", String(index));
        return button;
    }

    function moveVersePart(source, index) {
        var from = source === "answer" ? verseState.answer : verseState.available;
        var to = source === "answer" ? verseState.available : verseState.answer;
        if (!from[index] || verseState.solved) {
            return;
        }
        to.push(from.splice(index, 1)[0]);
        tone("tap");
        renderVerse();
    }

    function hintVerse() {
        var wanted = verseState.answer.length;
        var index = verseState.available.findIndex(function (part) { return part.order === wanted; });
        if (index < 0) {
            byId("kids-v2-verse-feedback").textContent = tr("hintReset");
            return;
        }
        verseState.hints += 1;
        var nodes = byId("kids-v2-verse-bank").querySelectorAll(".kids-v2-word-tile");
        if (nodes[index]) {
            nodes[index].classList.add("is-hint");
            nodes[index].focus();
        }
        byId("kids-v2-verse-feedback").textContent = tr("hintNext");
    }

    function checkVerse() {
        var item = currentVerse();
        var feedback = byId("kids-v2-verse-feedback");
        if (verseState.answer.length !== item.chunks.length) {
            feedback.className = "kids-v2-feedback is-bad";
            feedback.textContent = tr("verseIncomplete");
            tone("bad");
            return;
        }
        var correct = verseState.answer.every(function (part, index) { return part.order === index; });
        if (!correct) {
            feedback.className = "kids-v2-feedback is-bad";
            feedback.textContent = tr("verseAlmost");
            tone("bad");
            return;
        }
        feedback.className = "kids-v2-feedback is-good";
        feedback.textContent = tr("verseCorrect", { ref: item.ref });
        if (!verseState.solved) {
            verseState.solved = true;
            var key = verseState.difficulty + ":" + verseState.index;
            if (!progress.verse.solved[key]) {
                progress.verse.solved[key] = true;
                progress.verse.completed = integer(progress.verse.completed) + 1;
                awardStars(Math.max(1, 3 - verseState.hints));
            } else {
                tone("win");
            }
        }
    }

    var quizState = { world: null, index: 0, correct: 0, locked: false };

    function worldName(world) {
        var tamil = cardLanguage() === "ta" && TAMIL_WORLDS[world.id];
        return tamil ? TAMIL_WORLDS[world.id].name : world.name;
    }

    function localizedQuestion(world, index) {
        var source = world.questions[index];
        var tamilWorld = cardLanguage() === "ta" ? TAMIL_WORLDS[world.id] : null;
        var tamil = tamilWorld && tamilWorld.q[index];
        return {
            text: tamil ? tamil[0] : source.text,
            choices: tamil ? tamil[1] : source.choices,
            answer: source.answer,
            reference: source.reference,
            explanation: tamil ? tamil[2] : source.explanation
        };
    }

    function renderWorlds() {
        var grid = byId("kids-v2-world-grid");
        if (!grid) {
            return;
        }
        grid.innerHTML = "";
        worlds.forEach(function (world) {
            var stars = integer((progress.adventure.worlds || {})[world.id]);
            var button = document.createElement("button");
            button.type = "button";
            button.className = "kids-v2-world-card" + (stars ? " is-complete" : "");
            button.setAttribute("data-world", world.id);
            button.innerHTML = "<span aria-hidden=\"true\">" + world.icon + "</span><strong>" + worldName(world) + "</strong><small aria-label=\"" + stars + " " + tr("stars") + "\">" + new Array(stars + 1).join("★") + new Array(4 - stars).join("☆") + "</small>";
            grid.appendChild(button);
        });
    }

    function showWorlds() {
        byId("kids-v2-world-grid").hidden = false;
        byId("kids-v2-quiz-stage").hidden = true;
        byId("kids-v2-quiz-result").hidden = true;
        renderWorlds();
    }

    function startWorld(id) {
        quizState.world = worlds.filter(function (world) { return world.id === id; })[0] || worlds[0];
        quizState.index = 0;
        quizState.correct = 0;
        quizState.locked = false;
        byId("kids-v2-world-grid").hidden = true;
        byId("kids-v2-quiz-result").hidden = true;
        byId("kids-v2-quiz-stage").hidden = false;
        renderQuestion();
    }

    function renderQuestion() {
        var world = quizState.world;
        var item = localizedQuestion(world, quizState.index);
        quizState.locked = false;
        byId("kids-v2-quiz-world").textContent = world.icon + " " + worldName(world);
        byId("kids-v2-quiz-count").textContent = tr("questionOf", { current: quizState.index + 1, total: world.questions.length });
        byId("kids-v2-quiz-progress").style.width = ((quizState.index + 1) / world.questions.length * 100) + "%";
        byId("kids-v2-quiz-question").textContent = item.text;
        byId("kids-v2-quiz-feedback").hidden = true;
        byId("kids-v2-quiz-next").hidden = true;
        var answers = byId("kids-v2-quiz-answers");
        answers.innerHTML = "";
        shuffle(item.choices.map(function (text, index) { return { text: text, correct: index === item.answer }; })).forEach(function (choice) {
            var button = document.createElement("button");
            button.type = "button";
            button.className = "kids-v2-answer";
            button.textContent = choice.text;
            button.setAttribute("data-correct", choice.correct ? "true" : "false");
            answers.appendChild(button);
        });
    }

    function answerQuestion(button) {
        if (quizState.locked) {
            return;
        }
        quizState.locked = true;
        var correct = button.getAttribute("data-correct") === "true";
        if (correct) {
            quizState.correct += 1;
            button.classList.add("is-correct");
            byId("kids-v2-quiz-feedback-title").textContent = tr("right");
            tone("good");
        } else {
            button.classList.add("is-wrong");
            byId("kids-v2-quiz-feedback-title").textContent = tr("goodTry");
            tone("bad");
        }
        byId("kids-v2-quiz-answers").querySelectorAll(".kids-v2-answer").forEach(function (answer) {
            answer.disabled = true;
            if (answer.getAttribute("data-correct") === "true") {
                answer.classList.add("is-correct");
            }
        });
        var item = localizedQuestion(quizState.world, quizState.index);
        byId("kids-v2-quiz-explanation").textContent = item.explanation;
        byId("kids-v2-quiz-reference").textContent = tr("readIt", { ref: item.reference });
        byId("kids-v2-quiz-feedback").hidden = false;
        byId("kids-v2-quiz-next").textContent = quizState.index + 1 >= quizState.world.questions.length ? tr("seeStars") : tr("nextQuestion");
        byId("kids-v2-quiz-next").hidden = false;
    }

    function nextQuestion() {
        quizState.index += 1;
        if (quizState.index < quizState.world.questions.length) {
            renderQuestion();
        } else {
            finishWorld();
        }
    }

    function finishWorld() {
        var stars = quizState.correct === 3 ? 3 : quizState.correct === 2 ? 2 : quizState.correct === 1 ? 1 : 0;
        var oldBest = integer((progress.adventure.worlds || {})[quizState.world.id]);
        progress.adventure.worlds[quizState.world.id] = Math.max(oldBest, stars);
        if (stars > oldBest) {
            awardStars(stars - oldBest);
        } else {
            saveProgress();
            tone("win");
        }
        byId("kids-v2-quiz-stage").hidden = true;
        byId("kids-v2-quiz-result-copy").textContent = tr("quizResult", {
            correct: quizState.correct,
            total: quizState.world.questions.length,
            world: worldName(quizState.world)
        });
        byId("kids-v2-quiz-result-stars").textContent = new Array(stars + 1).join("★") + new Array(4 - stars).join("☆");
        byId("kids-v2-quiz-result").hidden = false;
    }

    function rerenderLanguage() {
        applyStaticLanguage();
        renderDashboard();
        renderMemory();
        renderVerse();
        if (!byId("kids-v2-memory-result").hidden) {
            byId("kids-v2-memory-result-copy").textContent = tr("memoryResult", {
                pairs: memoryState.size / 2,
                moves: memoryState.moves
            });
        }
        if (!byId("kids-v2-quiz-stage").hidden && quizState.world) {
            renderQuestion();
        }
        if (!byId("kids-v2-quiz-result").hidden && quizState.world) {
            byId("kids-v2-quiz-result-copy").textContent = tr("quizResult", {
                correct: quizState.correct,
                total: quizState.world.questions.length,
                world: worldName(quizState.world)
            });
        }
    }

    root.addEventListener("click", function (event) {
        var open = event.target.closest("[data-kids-v2-open]");
        if (open) {
            openExperience(open.getAttribute("data-kids-v2-open"));
            return;
        }
        if (event.target.closest("[data-kids-v2-back]")) {
            showDashboard();
            return;
        }
        var memoryCard = event.target.closest(".kids-v2-memory-card");
        if (memoryCard) {
            chooseMemory(integer(memoryCard.getAttribute("data-card-index")));
            return;
        }
        var tile = event.target.closest(".kids-v2-word-tile");
        if (tile) {
            moveVersePart(tile.getAttribute("data-source"), integer(tile.getAttribute("data-index")));
            return;
        }
        var world = event.target.closest(".kids-v2-world-card");
        if (world) {
            startWorld(world.getAttribute("data-world"));
            return;
        }
        var answer = event.target.closest(".kids-v2-answer");
        if (answer) {
            answerQuestion(answer);
        }
    });

    byId("kids-v2-continue").addEventListener("click", function () { openExperience(progress.lastActivity); });
    byId("kids-v2-memory-new").addEventListener("click", startMemory);
    byId("kids-v2-memory-retry").addEventListener("click", startMemory);
    byId("kids-v2-memory-size").addEventListener("change", startMemory);
    byId("kids-v2-memory-theme").addEventListener("change", startMemory);
    byId("kids-v2-verse-difficulty").addEventListener("click", function (event) {
        var button = event.target.closest("[data-difficulty]");
        if (!button) {
            return;
        }
        verseState.difficulty = button.getAttribute("data-difficulty");
        verseState.index = 0;
        byId("kids-v2-verse-difficulty").querySelectorAll("button").forEach(function (item) {
            item.setAttribute("aria-pressed", item === button ? "true" : "false");
        });
        newVerse();
    });
    byId("kids-v2-verse-hint").addEventListener("click", hintVerse);
    byId("kids-v2-verse-reset").addEventListener("click", newVerse);
    byId("kids-v2-verse-check").addEventListener("click", checkVerse);
    byId("kids-v2-verse-next").addEventListener("click", function () {
        verseState.index = (verseState.index + 1) % verses[verseState.difficulty].length;
        newVerse();
    });
    byId("kids-v2-verse-switch-en").addEventListener("click", function () {
        var card = root.closest(".kids-page-card");
        var toggle = card && card.querySelector(".card-lang-toggle");
        if (toggle && cardLanguage() === "ta") {
            toggle.click();
        }
    });
    byId("kids-v2-worlds-back").addEventListener("click", showWorlds);
    byId("kids-v2-quiz-next").addEventListener("click", nextQuestion);
    byId("kids-v2-quiz-replay").addEventListener("click", function () { startWorld(quizState.world.id); });
    byId("kids-v2-quiz-worlds").addEventListener("click", showWorlds);

    byId("kids-v2-rewards-button").addEventListener("click", function () {
        var panel = byId("kids-v2-rewards");
        panel.hidden = !panel.hidden;
        this.setAttribute("aria-expanded", panel.hidden ? "false" : "true");
    });

    function syncAudioButtons() {
        var sound = byId("kids-v2-sound");
        var music = byId("kids-v2-music");
        sound.setAttribute("aria-pressed", progress.settings.sound ? "true" : "false");
        sound.querySelector("i").className = progress.settings.sound ? "fa-solid fa-volume-high" : "fa-solid fa-volume-xmark";
        music.setAttribute("aria-pressed", progress.settings.music ? "true" : "false");
    }

    byId("kids-v2-sound").addEventListener("click", function () {
        progress.settings.sound = !progress.settings.sound;
        saveProgress();
        syncAudioButtons();
        if (progress.settings.sound) {
            tone("good");
        }
    });

    byId("kids-v2-music").addEventListener("click", function () {
        progress.settings.music = !progress.settings.music;
        saveProgress();
        syncAudioButtons();
        if (progress.settings.music) {
            startMusic();
        } else {
            stopMusic();
        }
    });

    var activePlayMs = 0;
    var breakDismissed = false;
    var breakTimer = window.setInterval(function () {
        var kidsPage = root.closest(".page-view");
        if (!document.hidden && kidsPage && kidsPage.classList.contains("active")) {
            activePlayMs += 30000;
        }
        if (!breakDismissed && activePlayMs >= BREAK_AFTER_MS) {
            byId("kids-v2-break").hidden = false;
        }
    }, 30000);
    byId("kids-v2-break-dismiss").addEventListener("click", function () {
        byId("kids-v2-break").hidden = true;
        breakDismissed = true;
        window.clearInterval(breakTimer);
    });

    document.addEventListener("visibilitychange", function () {
        if (document.hidden) {
            stopMusic();
        } else if (progress.settings.music) {
            /* Resuming follows an earlier user opt-in; browsers may still suspend the context. */
            startMusic();
        }
    });
    document.addEventListener("njc:authchange", updateGreeting);
    document.addEventListener("njc:cardlangchange", function (event) {
        var card = root.closest(".kids-page-card");
        var detail = event && event.detail ? event.detail : {};
        if (!detail.cardId || !card || detail.cardId === card.getAttribute("data-card-lang-id")) {
            rerenderLanguage();
        }
    });
    document.addEventListener("njc:langchange", rerenderLanguage);
    document.addEventListener("DOMContentLoaded", rerenderLanguage);

    newVerse();
    startMemory();
    rerenderLanguage();
    syncAudioButtons();
    saveProgress();
})();
