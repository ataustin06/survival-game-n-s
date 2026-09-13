/*
 * American Economy Task
 * Standalone Phaser 3 scene for both experimental conditions (version 6).
 *
 * Required URL parameters supplied by Qualtrics:
 *   gameId=...
 *   qualtricsId=... (responseId and ResponseID are also accepted)
 *   respondentDecile=1..10
 *   condition=insufficiency|sufficiency
 *
 * Optional URL parameters:
 *   saveUrl=https://...
 *   parentOrigin=https://your-qualtrics-domain.example
 *   selfInterestCondition=reveal|neutral
 *
 * Example Qualtrics link:
 * https://YOUR-GAME-URL/?gameId=${e://Field/gameId}
 *   &qualtricsId=${e://Field/ResponseID}
 *   &respondentDecile=${e://Field/respondentDecile}
 *   &condition=${e://Field/condition}
 *
 * Only the respondent's decile and anonymous IDs are passed to the game.
 * Their reported income and household size remain in Qualtrics.
 */

const DESIGN_WIDTH = 1280;
const DESIGN_HEIGHT = 720;
const NEED_PER_FAMILY = 10;
const DOLLARS_PER_UNIT = 5000;

const CLOSED_POOL_TEXT =
    'For this task, the number of income blocks is fixed. No additional blocks can be created, borrowed, or obtained from outside these ten groups.';

/*
 * Keep this true while testing locally.
 * Change it to false before launching the Qualtrics study.
 */
const TEST_MODE = true;

const TEST_DEFAULTS = Object.freeze({
    gameId: 'test_game_001',
    qualtricsId: 'test_response_001',
    respondentDecile: 5,
    condition: 'sufficiency',
    selfInterestCondition: ''
});
const CONDITION_CONFIGS = Object.freeze({
    insufficiency: Object.freeze({
        code: 'insufficiency',
        initialAllocation: Object.freeze([
            1, 2, 3, 4, 5, 6, 7, 10, 14, 28
        ]),
        totalUnits: 80,
        manipulationCorrectAnswer: 'no',
        equalUnitsPerFamily: 8,
        equalFamiliesMeetingNeed: 0,
        partialMaximumFamilies: 7,
        availableIncomeText:
            'There are 80 income blocks divided among these 10 families.',
        boardAvailableText:
            '80 income blocks available'
    }),

    sufficiency: Object.freeze({
        code: 'sufficiency',
        initialAllocation: Object.freeze([
            2, 4, 6, 8, 10, 12, 14, 20, 28, 56
        ]),
        totalUnits: 160,
        manipulationCorrectAnswer: 'yes',
        equalUnitsPerFamily: 16,
        equalFamiliesMeetingNeed: 10,
        partialMaximumFamilies: 10,
        availableIncomeText:
            'There are 160 income blocks divided among these 10 families.',
        boardAvailableText:
            '160 income blocks available'
    })
});

const CONDITION_ALIASES = Object.freeze({
    insufficiency: 'insufficiency',
    insufficient: 'insufficiency',
    sufficiency: 'sufficiency',
    sufficient: 'sufficiency'
});

const DEFAULT_SAVE_ENDPOINT =
    'https://script.google.com/macros/s/AKfycbw7gC4fioN5tZmUNqytGbMiBiLyMP74_dtTvbh1ohkikchXR_89HrrGcr7skITh8Vn5_Q/exec';

const COLORS = Object.freeze({
    page: 0xf4f6f8,
    panel: 0xffffff,
    card: 0xf9fafb,
    cardSelected: 0xfff4df,
    cardMet: 0xeaf6ee,
    cardBelow: 0xf5f6f7,
    border: 0x263238,
    mutedBorder: 0xaab2b8,
    resource: 0x86c995,
    resourceBorder: 0x1f6f43,
    resourceSeal: 0xcce8d3,
    resourceSelected: 0xf2994a,
    respondentDecile: 0x1b6f3a,
    threshold: 0x8e44ad,
    button: 0x17202a,
    buttonLight: 0xe8ecef,
    ink: '#17202a',
    muted: '#5f6b76',
    buttonText: '#ffffff',
    success: '#1b6f3a',
    warning: '#9c5b00'
});

const REDISTRIBUTION_QUESTIONS = Object.freeze([
    {
        code: 'equal_redistribution',
        prompt:
            'Thinking about the American economy as shown in this scenario, should income be divided equally among all families, or should each family keep its starting income?',
        options: [
            {
                code: 'equal',
                title: 'Divide income equally',
                detail:
                    'Income should be divided equally among all families.'
            },
            {
                code: 'keep',
                title: 'Keep incomes as they are',
                detail:
                    'Each family should keep its starting income.'
            }
        ]
    },
    {
        code: 'partial_redistribution',
        prompt:
            'Thinking about the American economy as shown in this scenario, should income above the basic-needs line be redistributed to allow the greatest possible number of families to have at least $50,000, or should each family keep its starting income?',
        options: [
            {
                code: 'partial',
                title: 'Redistribute to meet basic needs',
                detail:
                    'Redistribute income held above the basic-needs line so that the greatest possible number of families have at least $50,000.'
            },
            {
                code: 'keep',
                title: 'Keep incomes as they are',
                detail:
                    'Each family should keep its starting income.'
            }
        ]
    },
    {
        code: 'government_feasibility',
        prompt:
            'Thinking about the American economy as shown in this scenario, would it be possible for government policy to ensure that every family has enough income to meet its basic needs?',
        options: [
            {
                code: 'possible',
                title: 'It would be possible',
                detail:
                    'Government policy could ensure that every family has enough income to meet its basic needs.'
            },
            {
                code: 'not_possible',
                title: 'It would not be possible',
                detail:
                    'Government policy could not ensure that every family has enough income to meet its basic needs.'
            }
        ]
    },
    {
        code: 'redistributive_guarantee',
        prompt:
            'Thinking about the American economy as shown in this scenario, should the government redistribute income to guarantee that every family has enough income to meet its basic needs?',
        options: [
            {
                code: 'support_guarantee',
                title: 'Guarantee a basic-needs income',
                detail:
                    'The government should redistribute income to guarantee that every family has enough income to meet its basic needs.'
            },
            {
                code: 'oppose_guarantee',
                title: 'Do not guarantee a basic-needs income',
                detail:
                    'The government should not use income redistribution to guarantee that every family has enough income to meet its basic needs.'
            }
        ]
    }
]);

const ECONOMIC_PRINCIPLES = Object.freeze([
    {
        code: 'responsibility',
        prompt:
            'Thinking about the American economy as shown in this scenario, should each family be primarily responsible for meeting its own basic needs, or should people share responsibility for making sure every family can meet its basic needs?',
        options: [
            {
                code: 'shared',
                title: 'Shared responsibility',
                detail:
                    'People in the United States should share responsibility for making sure every family can meet its basic needs.'
            },
            {
                code: 'personal',
                title: 'Personal responsibility',
                detail:
                    'Each family should be primarily responsible for making sure it can meet its own basic needs.'
            }
        ]
    },
    {
        code: 'fairness',
        prompt:
            'Thinking about the American economy as shown in this scenario, which approach to distributing income would be fairer?',
        options: [
            {
                code: 'equity',
                title: 'Give more to families with less',
                detail:
                    'Families with lower incomes should receive additional income so that every family has an equal opportunity to meet its basic needs.'
            },
            {
                code: 'proportionality',
                title: 'Reward hard work and contribution',
                detail:
                    'Families should receive income in proportion to how much their members work and contribute, so people are rewarded for working hard.'
            }
        ]
    },
    {
        code: 'time',
        prompt:
            'Thinking about the American economy as shown in this scenario, which should receive greater priority: improving economic well-being and production today, or investing to improve economic well-being and production in the future?',
        options: [
            {
                code: 'present',
                title: 'Prioritize the present',
                detail:
                    'Economic resources should be used primarily to improve well-being and production today.'
            },
            {
                code: 'future',
                title: 'Invest for the future',
                detail:
                    'Economic resources should be invested primarily to improve well-being and production in the future.'
            }
        ]
    },
    {
        code: 'scope',
        prompt:
            'Thinking about the American economy as shown in this scenario, should U.S. economic resources help people in other countries meet their basic needs, or prioritize people in the United States?',
        options: [
            {
                code: 'international',
                title: 'Help people in other countries',
                detail:
                    'Use some U.S. economic resources to help people in other countries meet their basic needs, even if this leaves fewer resources in the United States.'
            },
            {
                code: 'domestic',
                title: 'Prioritize people in the United States',
                detail:
                    'Prioritize helping people in the United States meet their basic needs, even if some people in other countries cannot meet theirs.'
            }
        ]
    },
    {
        code: 'strategy',
        prompt:
            'Thinking about the American economy as shown in this scenario, are people more likely to cooperate with one another or compete with one another for economic resources?',
        options: [
            {
                code: 'cooperate',
                title: 'More likely to cooperate',
                detail:
                    'People are more likely to work together to obtain economic resources.'
            },
            {
                code: 'compete',
                title: 'More likely to compete',
                detail:
                    'People are more likely to compete with one another for economic resources.'
            }
        ]
    }
]);

export default class Start extends Phaser.Scene
{
    constructor ()
    {
        super('Start');

        this.conditionName = null;
        this.conditionConfig = null;
        this.requestedSelfInterestCondition = '';
    }

    preload ()
    {
        // No external assets are required.
    }

    create ()
    {
        this.cameras.main.setBackgroundColor(
            COLORS.page
        );

        const urlParams =
            new URLSearchParams(
                window.location.search
            );

        const requestedConditionRaw = (
            urlParams.get('condition') ||
            (
                TEST_MODE
                    ? TEST_DEFAULTS.condition
                    : ''
            )
        ).trim().toLowerCase();

        const requestedCondition =
            CONDITION_ALIASES[
                requestedConditionRaw
            ] || requestedConditionRaw;

        this.conditionConfig =
            CONDITION_CONFIGS[
                requestedCondition
            ] || null;

        this.conditionName =
            this.conditionConfig
                ? this.conditionConfig.code
                : requestedCondition;

        const gameId = (
            urlParams.get('gameId') ||
            (
                TEST_MODE
                    ? TEST_DEFAULTS.gameId
                    : ''
            )
        ).trim();

        const qualtricsId = (
            urlParams.get('qualtricsId') ||
            urlParams.get('responseId') ||
            urlParams.get('ResponseID') ||
            (
                TEST_MODE
                    ? TEST_DEFAULTS.qualtricsId
                    : ''
            )
        ).trim();

        const respondentDecileRaw =
            Number.parseInt(
                urlParams.get('respondentDecile') ||
                (
                    TEST_MODE
                        ? String(
                            TEST_DEFAULTS.respondentDecile
                        )
                        : ''
                ),
                10
            );

        const respondentDecile =
            respondentDecileRaw >= 1 &&
            respondentDecileRaw <= 10
                ? respondentDecileRaw
                : null;

        this.requestedSelfInterestCondition = (
            urlParams.get('selfInterestCondition') ||
            (
                TEST_MODE
                    ? TEST_DEFAULTS.selfInterestCondition
                    : ''
            )
        ).trim().toLowerCase();

        this.initialAllocation =
            this.conditionConfig
                ? [
                    ...this.conditionConfig.initialAllocation
                ]
                : [];

        this.totalUnits =
            this.conditionConfig
                ? this.conditionConfig.totalUnits
                : 0;

        this.saveEndpoint =
            urlParams.get('saveUrl') ||
            DEFAULT_SAVE_ENDPOINT;

        this.parentOrigin =
            this.resolveParentOrigin(
                urlParams.get('parentOrigin')
            );

        this.sessionStartPerformance =
            performance.now();

        this.currentScreenName = null;
        this.currentScreenStartedAt = null;
        this.screenObjects = [];
        this.currentAllocation = [];
        this.allocationMode = null;
        this.selectedSourceDecile = null;
        this.isDraggingResource = false;
        this.cardBounds = [];
        this.boardFeedbackMessage = '';
        this.selfInterestEqualApplied = false;
        this.selfInterestPartialApplied = false;

        this.gameData = {
            gameId,
            qualtricsId,
            condition: this.conditionName,
            gameVersion:
                'national_deciles_v6_self_interest_randomized',

            initialAllocation: [
                ...this.initialAllocation
            ],

            totalUnits: this.totalUnits,
            dollarsPerUnit: DOLLARS_PER_UNIT,
            needPerFamilyUnits: NEED_PER_FAMILY,
            needPerFamilyDollars:
                NEED_PER_FAMILY * DOLLARS_PER_UNIT,

            closedResourcePool: true,

            simplifiedGini:
                this.calculateGini(
                    this.initialAllocation
                ),

            respondentDecile,
            selfInterestCondition: null,
            respondentDecileRevealed: false,

            gameStartTime:
                new Date().toISOString(),

            gameEndTime: null,
            totalDurationMs: null,
            userAgent: navigator.userAgent,
            screenWidth: window.innerWidth,
            screenHeight: window.innerHeight,
            deviceAllowed: this.isDesktopSized(),

            comprehensionCheckChoice: null,
            comprehensionCheckPassed: null,

            manipulationCheckChoice: null,
            manipulationCheckPassed: null,

            dragPracticeAttempts: 0,
            dragPracticeCompleted: false,

            freeAllocationFinal: null,
            freeAllocationFamiliesMeetingNeed: null,
            freeAllocationGini: null,
            freeAllocationClassification: null,
            freeAllocationTotalMoved: null,
            respondentFreeAllocationChange: null,

            equalDivisionFinal: null,
            equalDivisionFamiliesMeetingNeed: null,
            equalDivisionOutcomeChoice: null,
            equalDivisionOutcomePassed: null,

            partialRedistributionFinal: null,
            partialRedistributionFamiliesMeetingNeed: null,

            partialRedistributionMaximumPossible:
                this.conditionConfig
                    ? this.conditionConfig
                        .partialMaximumFamilies
                    : null,

            partialRedistributionReachedMaximum: null,
            partialRedistributionTotalMoved: null,

            selfInterestAllocationFinal: null,
            selfInterestAllocationFamiliesMeetingNeed: null,
            selfInterestAllocationGini: null,
            selfInterestAllocationClassification: null,
            selfInterestAllocationTotalMoved: null,
            selfInterestOwnStartingBlocks: null,
            selfInterestOwnFinalBlocks: null,
            selfInterestOwnChange: null,
            selfInterestEqualButtonUsed: false,
            selfInterestPartialButtonUsed: false,

            redistributionChoices: {},
            redistributionOptionOrders: {},
            economicPrinciples: {},
            economicPrincipleOptionOrders: {},

            actions: [],
            screenTimings: {},

            saveStatus: null,
            saveAcknowledged: false,
            saveError: null,
            parentBackupSent: false,
            localBackupKey: null
        };

        const launchErrors = [];

        if (!this.isValidExternalId(gameId))
        {
            launchErrors.push(
                'a valid game ID'
            );
        }

        if (!this.isValidExternalId(qualtricsId))
        {
            launchErrors.push(
                'a valid Qualtrics response ID'
            );
        }

        if (respondentDecile === null)
        {
            launchErrors.push(
                'a respondent income decile from 1 to 10'
            );
        }

        if (!this.conditionConfig)
        {
            launchErrors.push(
                'a valid condition ' +
                '(insufficiency or sufficiency)'
            );
        }

        if (launchErrors.length > 0)
        {
            this.showLaunchError(
                launchErrors
            );

            return;
        }

        this.validateConditionConfiguration();

        if (!this.isDesktopSized())
        {
            this.showDesktopRequirement();
            return;
        }

        this.showWelcomeScreen();
    }

    /*
     * This method must remain outside create(),
     * but inside the Start class.
     */
    assignSelfInterestCondition ()
    {
        const validConditions = [
            'reveal',
            'neutral'
        ];

        if (
            validConditions.includes(
                this.requestedSelfInterestCondition
            )
        )
        {
            return this.requestedSelfInterestCondition;
        }

        const storageKey =
            `americanEconomySelfInterest:${this.gameData.gameId}`;

        try
        {
            const storedCondition =
                sessionStorage.getItem(
                    storageKey
                );

            if (
                validConditions.includes(
                    storedCondition
                )
            )
            {
                return storedCondition;
            }
        }
        catch (error)
        {
            /*
             * Continue with a new random assignment
             * if session storage is unavailable.
             */
        }

        let randomValue = Math.random();

        if (
            window.crypto &&
            typeof window.crypto.getRandomValues ===
                'function'
        )
        {
            const randomArray =
                new Uint32Array(1);

            window.crypto.getRandomValues(
                randomArray
            );

            randomValue =
                randomArray[0] / 4294967296;
        }

        const assignedCondition =
            randomValue < 0.5
                ? 'reveal'
                : 'neutral';

        try
        {
            sessionStorage.setItem(
                storageKey,
                assignedCondition
            );
        }
        catch (error)
        {
            /*
             * The assignment remains valid for
             * the current game even if it cannot
             * be stored.
             */
        }

        return assignedCondition;
    }

    isValidExternalId (value)
    {
        return (
            typeof value === 'string' &&
            /^[A-Za-z0-9_-]{3,200}$/.test(
                value
            )
        );
    }

    resolveParentOrigin (configuredOrigin)
    {
        const candidates = [
            configuredOrigin,
            document.referrer
        ];

        for (const candidate of candidates)
        {
            if (!candidate)
            {
                continue;
            }

            try
            {
                const parsed =
                    new URL(candidate);

                if (parsed.protocol === 'https:')
                {
                    return parsed.origin;
                }
            }
            catch (error)
            {
                /*
                 * Ignore invalid optional origins
                 * and try the next candidate.
                 */
            }
        }

        return null;
    }

    resolveParentOrigin (configuredOrigin)
    {
        const candidates = [configuredOrigin, document.referrer];

        for (const candidate of candidates)
        {
            if (!candidate) continue;

            try
            {
                const parsed = new URL(candidate);

                if (parsed.protocol === 'https:')
                {
                    return parsed.origin;
                }
            }
            catch (error)
            {
                // Ignore invalid optional origins and try the next candidate.
            }
        }

        return null;
    }

    validateConditionConfiguration ()
    {
        const configuredTotal = this.initialAllocation.reduce(
            (sum, value) => sum + value,
            0
        );

        if (configuredTotal !== this.totalUnits)
        {
            throw new Error(
                `Condition ${this.conditionName} has ${configuredTotal} ` +
                `allocated blocks but totalUnits is ${this.totalUnits}.`
            );
        }

        const calculatedEqualUnits =
            this.totalUnits / this.initialAllocation.length;

        if (
            calculatedEqualUnits !==
            this.conditionConfig.equalUnitsPerFamily
        )
        {
            throw new Error(
                `The configured equal-division result is incorrect for ` +
                `${this.conditionName}.`
            );
        }

        const calculatedEqualFamilies =
            calculatedEqualUnits >= NEED_PER_FAMILY
                ? this.initialAllocation.length
                : 0;

        if (
            calculatedEqualFamilies !==
            this.conditionConfig.equalFamiliesMeetingNeed
        )
        {
            throw new Error(
                `The configured equal-division family count is incorrect ` +
                `for ${this.conditionName}.`
            );
        }

        const alreadyMeetingNeed = this.initialAllocation.filter(
            value => value >= NEED_PER_FAMILY
        ).length;

        let transferableSurplus = this.initialAllocation.reduce(
            (sum, value) =>
                sum + Math.max(0, value - NEED_PER_FAMILY),
            0
        );

        let calculatedPartialMaximum = alreadyMeetingNeed;

        const deficits = this.initialAllocation
            .filter(value => value < NEED_PER_FAMILY)
            .map(value => NEED_PER_FAMILY - value)
            .sort((a, b) => a - b);

        deficits.forEach(deficit => {
            if (deficit <= transferableSurplus)
            {
                transferableSurplus -= deficit;
                calculatedPartialMaximum += 1;
            }
        });

        if (
            calculatedPartialMaximum !==
            this.conditionConfig.partialMaximumFamilies
        )
        {
            throw new Error(
                `The configured partial-redistribution maximum is ` +
                `incorrect for ${this.conditionName}.`
            );
        }
    }

    showLaunchError (launchErrors)
    {
        this.enterScreen('launch_error');
        this.clearScreen();
        this.addPanel(640, 360, 1000, 500);

        this.addScreenText(
            640,
            190,
            'This task could not begin',
            38,
            COLORS.warning,
            800,
            'center'
        ).setOrigin(0.5);

        this.addScreenText(
            640,
            330,
            `The game link is missing ${launchErrors.join(', ')}. ` +
                'Please close this tab, return to the survey, and open the task again.',
            25,
            COLORS.ink,
            820,
            'center'
        ).setOrigin(0.5);
    }

    isDesktopSized ()
    {
        const mobileUserAgent = /Mobi|Android|iPhone|iPad/i.test(
            navigator.userAgent
        );

        return !mobileUserAgent && window.innerWidth >= 1000;
    }

    showDesktopRequirement ()
    {
        this.enterScreen('desktop_requirement');
        this.clearScreen();
        this.addPanel(640, 360, 980, 430);

        this.addScreenText(
            640,
            245,
            'A laptop or desktop computer is required',
            36,
            COLORS.ink,
            850,
            'center'
        ).setOrigin(0.5);

        this.addScreenText(
            640,
            390,
            'This activity uses a large drag-and-drop board and cannot be completed on a phone or tablet. Please reopen the study on a laptop or desktop computer.',
            26,
            COLORS.ink,
            820,
            'center'
        ).setOrigin(0.5);
    }

showWelcomeScreen ()
{
    this.enterScreen('welcome');
    this.clearScreen();
    this.addPanel(640, 360, 1000, 500);

    this.addScreenText(
        640,
        220,
        'Welcome to the American Economy Task',
        40,
        COLORS.ink,
        850,
        'center'
    ).setOrigin(0.5);

    this.addScreenText(
        640,
        350,
        'You will view information and make choices about how income is divided among families in the United States.',
        27,
        COLORS.ink,
        820,
        'center'
    ).setOrigin(0.5);

    this.addButton(
        640,
        555,
        190,
        56,
        'Next',
        () => {
            this.showTaskInstructions();
        }
    );
}

showTaskInstructions ()
{
    this.enterScreen('task_instructions');
    this.clearScreen();
    this.addPanel(640, 360, 1000, 520);

    this.addScreenText(
        640,
        155,
        'Before you begin',
        38,
        COLORS.ink,
        800,
        'center'
    ).setOrigin(0.5);

    this.addScreenText(
        640,
        285,
        'Please complete this task on a laptop or desktop computer. Do not use a phone or tablet.',
        27,
        COLORS.warning,
        820,
        'center'
    ).setOrigin(0.5);

    this.addScreenText(
        640,
        420,
        'Read each screen carefully and answer every question to the best of your ability.',
        26,
        COLORS.ink,
        820,
        'center'
    ).setOrigin(0.5);

    this.addButton(
        640,
        575,
        190,
        56,
        'Begin',
        () => {
            this.showIncomeDifferencesIntroduction();
        }
    );
}

    // Screen 1
    showIncomeDifferencesIntroduction ()
{
    this.enterScreen('income_differences_introduction');
    this.clearScreen();
    this.addPanel(640, 360, 1080, 600);

    this.addScreenText(
        640,
        150,
        'In the United States, families\' incomes differ. \n \n Some families have more than enough income to meet their basic needs, while others do not.',
        27,
        COLORS.ink,
        920,
        'center'
    ).setOrigin(0.5);

    this.drawFamilyWithBlocks(410, 365, 6, 0.9);
    this.drawFamilyWithBlocks(870, 365, 14, 0.9);

    const basicNeedsLineY = 370;

    const basicNeedsLine = this.add.line(
        0,
        0,
        300,
        basicNeedsLineY,
        980,
        basicNeedsLineY,
        COLORS.threshold,
        1
    ).setOrigin(0, 0);

    basicNeedsLine.setLineWidth(4);
    basicNeedsLine.setDepth(60);
    this.addScreenObject(basicNeedsLine);

    this.addScreenText(
        640,
        basicNeedsLineY - 26,
        'Basic-needs line',
        16,
        '#6c3483',
        180,
        'center'
    ).setOrigin(0.5, 0).setDepth(61);

    this.addScreenText(
        640,
        530,
        'Governments make choices about whether income should be redistributed and, if so, how.',
        27,
        COLORS.ink,
        900,
        'center'
    ).setOrigin(0.5);

    this.addButton(640, 635, 190, 56, 'Next', () => {
        this.showBasicNeedsThreshold();
    });
}
    // Screen 2
    showBasicNeedsThreshold ()
    {
        this.enterScreen('basic_needs_threshold');
        this.clearScreen();
        this.addPanel(640, 360, 1080, 620);

        this.addScreenText(
            640,
            125,
            'A family of four needs about $50,000 a year to meet its basic needs in the United States today. \n \n These needs include food, housing, and basic medical care.',
            27,
            COLORS.ink,
            930,
            'center'
        ).setOrigin(0.5);

        this.drawFamilyGlyph(470, 325, 1.45);
        this.drawBlockStack(760, 380, 10, 100, 10, 4);

        this.addScreenText(
            760,
            420,
            '$50,000 = 10 income blocks',
            25,
            COLORS.ink,
            340,
            'center'
        ).setOrigin(0.5);

        this.addScreenText(
            640,
            515,
            'In this game, ten income blocks represent $50,000.',
            27,
            COLORS.ink,
            860,
            'center'
        ).setOrigin(0.5);

        this.addButton(640, 635, 190, 54, 'Next', () => {
            this.showBasicNeedsComprehensionCheck();
        });
    }

   // Comprehension check
showBasicNeedsComprehensionCheck ()
{
    this.enterScreen('basic_needs_comprehension_check');
    this.clearScreen();
    this.addPanel(640, 360, 1000, 520);

    this.addScreenText(
        640,
        175,
        'According to the game, how many income blocks represent $50,000?',
        29,
        COLORS.ink,
        880,
        'center'
    ).setOrigin(0.5);

    const choices = [
        '5 income blocks',
        '10 income blocks',
        '15 income blocks'
    ];

    choices.forEach((choice, index) => {
        this.addButton(
            640,
            320 + index * 76,
            360,
            52,
            choice,
            () => {
                const correct =
                    choice === '10 income blocks';

                this.gameData.comprehensionCheckChoice = choice;
                this.gameData.comprehensionCheckPassed = correct;

                this.recordAnswer(
                    'comprehension_check',
                    choice
                );

                if (correct)
                {
                    this.showCorrectBasicNeedsFeedback();
                }
                else
                {
                    this.showIncorrectBasicNeedsFeedback(choice);
                }
            },
            COLORS.buttonLight,
            COLORS.ink
        );
    });
}

// Shown after selecting 10 income blocks
showCorrectBasicNeedsFeedback ()
{
    this.enterScreen('basic_needs_check_correct');
    this.clearScreen();
    this.addPanel(640, 360, 900, 540);

    this.addScreenText(
        640,
        135,
        'Correct',
        40,
        COLORS.success,
        700,
        'center'
    ).setOrigin(0.5);

    this.addScreenText(
        640,
        220,
        'In this game, 10 income blocks represent $50,000.',
        27,
        COLORS.ink,
        760,
        'center'
    ).setOrigin(0.5);

    this.drawBlockStack(
        640,
        450,
        10,
        110,
        9,
        4
    );

    this.addScreenText(
        640,
        505,
        '$50,000 = 10 income blocks',
        24,
        COLORS.ink,
        600,
        'center'
    ).setOrigin(0.5);

    this.addButton(
        640,
        615,
        190,
        54,
        'Next',
        () => {
            this.showAboveAndBelowThreshold();
        }
    );
}

// Shown after selecting 5 or 15 income blocks
showIncorrectBasicNeedsFeedback (selectedChoice)
{
    this.enterScreen('basic_needs_check_incorrect');
    this.clearScreen();
    this.addPanel(640, 360, 900, 560);

    this.addScreenText(
        640,
        120,
        'Not quite',
        38,
        COLORS.warning,
        700,
        'center'
    ).setOrigin(0.5);

    this.addScreenText(
        640,
        195,
        `You selected ${selectedChoice}.`,
        24,
        COLORS.ink,
        700,
        'center'
    ).setOrigin(0.5);

    this.addScreenText(
        640,
        250,
        'The correct answer is 10 income blocks.',
        28,
        COLORS.ink,
        760,
        'center'
    ).setOrigin(0.5);

    this.drawBlockStack(
        640,
        465,
        10,
        110,
        9,
        4
    );

    this.addScreenText(
        640,
        520,
        '$50,000 = 10 income blocks',
        24,
        COLORS.ink,
        600,
        'center'
    ).setOrigin(0.5);
    this.addButton(
        640,
        635,
        190,
        54,
        'Next',
        () => {
            this.showAboveAndBelowThreshold();
        }
    );
}

// Screen 4
showAboveAndBelowThreshold ()
{
    this.enterScreen('above_and_below_threshold');
    this.clearScreen();
    this.addPanel(640, 360, 1080, 620);

    this.addScreenText(
        640,
        95,
        'Some families\' incomes are more than $50,000, while others are less.\n',
        27,
        COLORS.ink,
        980,
        'center'
    ).setOrigin(0.5);

    this.addScreenText(
        640,
        127,
        'The purple line represents the $50,000 a family needs to meet its basic needs.',
        27,
        COLORS.ink,
        920,
        'center'
    ).setOrigin(0.5);

    this.drawExampleIncomeCard(
        415,
        170,
        300,
        375,
       13,
        'This family\'s income is about',
        1,
        '$65,000',
        '$65,000 is more than $50,000.'
    );

    this.drawExampleIncomeCard(
        865,
        170,
        300,
        375,
       7,
        'This family\'s income is about',
        1,
        '$35,000',
        '$35,000 is less than $50,000.'
    );

    this.addButton(
    640,
    650,
    190,
    54,
    'Next',
    () => {
        this.showRepresentativeFamilyExplanation();
    }
);
}

// Screen 5
showRepresentativeFamilyExplanation ()
{
    this.enterScreen('representative_family_explanation');
    this.clearScreen();
    this.addPanel(640, 360, 1040, 600);

    this.addScreenText(
        640,
        150,
        'Each family shown in this game represents a group of American families with similar incomes.',
        27,
        COLORS.ink,
        900,
        'center'
    ).setOrigin(0.5);

    this.drawFamilyGlyph(
        640,
        275,
        1.35
    );

    this.drawBlockStack(
        640,
        440,
        8,
        110,
        9,
        4
    );

    this.addScreenText(
        640,
        535,
        'In this scenario, the income shown for each family is the average yearly income of families in that income group before taxes and government benefits are taken into account.',
        26,
        COLORS.ink,
        900,
        'center'
    ).setOrigin(0.5);

    this.addButton(
        640,
        650,
        190,
        54,
        'Next',
        () => {
            this.showBottomDecile();
        }
    );
}
    // Screen 5
    showBottomDecile ()
    {
        this.enterScreen('bottom_decile_example');
        this.clearScreen();
        this.addPanel(640, 360, 1040, 610);

        this.addScreenText(
            640,
            75,
            'This family represents the lowest-income 10% of American families.',
            27,
            COLORS.ink,
            900,
            'center'
        ).setOrigin(0.5);

        this.drawExampleIncomeCard(
            640,
            145,
            300,
            380,
            this.initialAllocation[0],
            'Family 1'
        );

        this.addScreenText(
            640,
            575,
            'Their yearly income falls below the $50,000 basic-needs line.',
            27,
            COLORS.ink,
            880,
            'center'
        ).setOrigin(0.5);

        this.addButton(640, 665, 190, 52, 'Next', () => {
            this.showTopDecile();
        });
    }

    // Screen 6
    showTopDecile ()
    {
        this.enterScreen('top_decile_example');
        this.clearScreen();
        this.addPanel(640, 360, 1100, 620);

        this.addScreenText(
            640,
            75,
            'This family represents the highest-income 10% of American families.',
            27,
            COLORS.ink,
            940,
            'center'
        ).setOrigin(0.5);

        this.drawExampleIncomeCard(
            640,
            125,
            270,
            400,
            this.initialAllocation[9],
            'Family 10'
        );

        this.addScreenText(
            640,
            570,
            'Their yearly income extends above the $50,000 basic-needs line.',
            27,
            COLORS.ink,
            900,
            'center'
        ).setOrigin(0.5)
        this.addButton(640, 668, 190, 50, 'Next', () => {
            this.showFullStartingDistribution();
        });
    }

    // Screen 7
    showFullStartingDistribution ()
    {
        this.enterScreen('full_starting_distribution');
        this.clearScreen();

        this.addScreenText(
            640,
            50,
            'Here are 10 families. Each represents one-tenth of American families, ordered by income. Each one-tenth is called an income decile. In this scenario, the income shown is the average income of families in that decile.',
            27,
            COLORS.ink,
            1120,
            'center'
        ).setOrigin(0.5, 0);

        this.drawStaticTenDecileDistribution(155, 415);

        this.addScreenText(
            55,
            595,
            'Lowest income',
            16,
            COLORS.muted,
            180,
            'left'
        ).setOrigin(0, 0.5);

        this.addScreenText(
            1225,
            595,
            'Highest income',
            16,
            COLORS.muted,
            180,
            'right'
        ).setOrigin(1, 0.5);

       this.addButton(
    640,
    665,
    190,
    50,
    'Next',
    () => {
        this.showCollectiveThresholdExplanation();
    }
);
    }

    showCollectiveThresholdExplanation ()
{
    this.enterScreen('collective_threshold_explanation');
    this.clearScreen();
    this.addPanel(640, 360, 1120, 610);

    this.addScreenText(
        640,
        95,
        'Each family needs 10 income blocks to reach the $50,000 basic-needs line.',
        29,
        COLORS.ink,
        1000,
        'center'
    ).setOrigin(0.5);

    for (let index = 0; index < 10; index += 1)
    {
        const x = 135 + index * 112;

        this.drawFamilyGlyph(
            x,
            285,
            0.52
        );

        this.drawBlockStack(
            x,
            390,
            10,
            66,
            6,
            2
        );

        this.addScreenText(
            x,
            425,
            '10 blocks',
            16,
            COLORS.ink,
            85,
            'center'
        ).setOrigin(0.5);
    }

    this.addScreenText(
        640,
        520,
        '10 families × 10 income blocks each = 100 income blocks',
        31,
        COLORS.ink,
        950,
        'center'
    ).setOrigin(0.5);

    this.addScreenText(
        640,
        570,
        'There must be at least 100 income blocks in total for all 10 families to meet their basic needs.',
        23,
        COLORS.ink,
        960,
        'center'
    ).setOrigin(0.5);

    this.addButton(
        640,
        665,
        190,
        50,
        'Next',
        () => {
            this.showAvailableIncomeDistribution();
        }
    );
}

showAvailableIncomeDistribution ()
{
    this.enterScreen('available_income_distribution');
    this.clearScreen();

    this.addScreenText(
        640,
        55,
        this.conditionConfig.availableIncomeText,
        31,
        COLORS.ink,
        1000,
        'center'
    ).setOrigin(0.5);

    this.addScreenText(
        640,
        105,
        CLOSED_POOL_TEXT,
        19,
        COLORS.muted,
        1040,
        'center'
    ).setOrigin(0.5);

    this.drawStaticTenDecileDistribution(
        155,
        410
    );

    this.addScreenText(
        85,
        595,
        'Lowest income',
        16,
        COLORS.muted,
        180,
        'left'
    ).setOrigin(0, 0.5);

    this.addScreenText(
        1195,
        595,
        'Highest income',
        16,
        COLORS.muted,
        180,
        'right'
    ).setOrigin(1, 0.5);

    this.addButton(
        640,
        665,
        190,
        50,
        'Next',
        () => {
            this.showFreeAllocationInstructions();
        }
    );
}

    // Screen 8
    showManipulationCheck ()
    {
        this.enterScreen('manipulation_check');
        this.clearScreen();
        this.addPanel(640, 360, 1040, 550);

        this.addScreenText(
            640,
            130,
            'Thinking about all 10 families',
            37,
            COLORS.ink,
            900,
            'center'
        ).setOrigin(0.5);

        this.addScreenText(
            640,
            245,
            'Considering all the income available across the 10 families, is there enough total income for every family to have at least $50,000?',
            27,
            COLORS.ink,
            900,
            'center'
        ).setOrigin(0.5);

        const choices = [
            { code: 'yes', label: 'Yes' },
            { code: 'no', label: 'No' },
            { code: 'not_sure', label: 'Not sure' }
        ];

        choices.forEach((choice, index) => {
            this.addButton(
                640,
                370 + index * 76,
                360,
                52,
                choice.label,
                () => {
                    this.gameData.manipulationCheckChoice = choice.code;
                    this.gameData.manipulationCheckPassed =
                        choice.code ===
                        this.conditionConfig.manipulationCorrectAnswer;
                    this.recordAnswer(
    'manipulation_check',
    choice.code
);

this.showFinalScreen();
                },
                COLORS.buttonLight,
                COLORS.ink
            );
        });
    }

    // Screen 9
    showFreeAllocationInstructions ()
    {
        this.enterScreen('drag_practice');
        this.clearScreen();
        this.addPanel(640, 360, 1120, 630);

        this.addScreenText(
            640,
            65,
            'Practice moving one income block',
            34,
            COLORS.ink,
            950,
            'center'
        ).setOrigin(0.5);

        this.addScreenText(
            640,
            125,
            'Click and hold the outlined green income block. Drag it into the family box on the right, then release it.',
            24,
            COLORS.ink,
            940,
            'center'
        ).setOrigin(0.5);

        const leftX = 390;
        const rightX = 890;
        const cardTop = 205;
        const cardWidth = 270;
        const cardHeight = 320;
        const stackBottom = 490;
        const blockWidth = 108;
        const blockHeight = 12;
        const blockGap = 4;

        [leftX, rightX].forEach((centerX, index) => {
            const card = this.add.rectangle(
                centerX,
                cardTop + cardHeight / 2,
                cardWidth,
                cardHeight,
                COLORS.card
            );
            card.setStrokeStyle(3, COLORS.border);
            this.addScreenObject(card);

            this.drawFamilyGlyph(centerX, cardTop + 68, 0.9);
            this.addScreenText(
                centerX,
                cardTop + 125,
                index === 0 ? 'Move from here' : 'Drop here',
                21,
                COLORS.ink,
                220,
                'center'
            ).setOrigin(0.5);
        });

        this.drawBlockStack(
            leftX,
            stackBottom,
            3,
            blockWidth,
            blockHeight,
            blockGap
        );

        this.drawBlockStack(
            rightX,
            stackBottom,
            2,
            blockWidth,
            blockHeight,
            blockGap
        );

        const practiceStartX = leftX;
        const practiceStartY =
            stackBottom - 3 * (blockHeight + blockGap);
        const practiceDestinationY =
            stackBottom - 2 * (blockHeight + blockGap);

        const destinationBounds = new Phaser.Geom.Rectangle(
            rightX - cardWidth / 2,
            cardTop,
            cardWidth,
            cardHeight
        );

        const practiceBlock = this.add.rectangle(
            practiceStartX,
            practiceStartY,
            blockWidth,
            blockHeight,
            COLORS.resource
        );

        practiceBlock.setStrokeStyle(4, COLORS.resourceSelected);
        practiceBlock.setDepth(100);

        practiceBlock.setInteractive(
            new Phaser.Geom.Rectangle(
                -blockWidth / 2 - 12,
                -blockHeight / 2 - 12,
                blockWidth + 24,
                blockHeight + 24
            ),
            Phaser.Geom.Rectangle.Contains
        );

        this.input.setDraggable(practiceBlock);
        this.addScreenObject(practiceBlock);

        const feedback = this.addScreenText(
            640,
            565,
            'Drag the outlined block into the box on the right.',
            20,
            COLORS.muted,
            850,
            'center'
        ).setOrigin(0.5);

        let practiceCompleted = false;

        practiceBlock.on('dragstart', () => {
            practiceBlock.setFillStyle(COLORS.resourceSelected);
            practiceBlock.setDepth(500);
        });

        practiceBlock.on('drag', (pointer, dragX, dragY) => {
            practiceBlock.x = dragX;
            practiceBlock.y = dragY - 12;
        });

        practiceBlock.on('dragend', pointer => {
            if (practiceCompleted) return;

            this.gameData.dragPracticeAttempts += 1;

            const successfulDrop = Phaser.Geom.Rectangle.Contains(
                destinationBounds,
                pointer.worldX,
                pointer.worldY
            );

            this.recordAction({
                action: 'drag_practice_attempt',
                attempt: this.gameData.dragPracticeAttempts,
                successful: successfulDrop
            });

            if (successfulDrop)
            {
                practiceCompleted = true;
                this.gameData.dragPracticeCompleted = true;
                practiceBlock.x = rightX;
                practiceBlock.y = practiceDestinationY;
                practiceBlock.setFillStyle(COLORS.resource);
                practiceBlock.setStrokeStyle(3, COLORS.success);
                practiceBlock.disableInteractive();

                feedback.setText(
                    'You moved one income block from one family to another.'
                );
                feedback.setColor(COLORS.success);

                this.addButton(640, 640, 230, 52, 'Begin task', () => {
                    this.startFreeAllocation();
                });
            }
            else
            {
                practiceBlock.x = practiceStartX;
                practiceBlock.y = practiceStartY;
                practiceBlock.setFillStyle(COLORS.resource);
                practiceBlock.setDepth(100);

                feedback.setText(
                    'Place the block anywhere inside the family box on the right.'
                );
            }
        });
    }

    startFreeAllocation ()
    {
        this.allocationMode = 'free';
        this.currentAllocation = [...this.initialAllocation];
        this.selectedSourceDecile = null;
        this.boardFeedbackMessage = '';
        this.enterScreen('free_allocation_board');
        this.redrawAllocationBoard();
    }

    redrawAllocationBoard ()
    {
        this.clearScreen();
        this.cardBounds = [];

        const mode = this.allocationMode || 'free';

        const boardTitles = {
            free: 'Arrange the income blocks in the way you think is best for America',
            equal: 'Divide the income equally among all 10 families',
            partial: 'Allow the greatest possible number of families to reach $50,000',
            self_interest:
                'Now arrange the income blocks in the way you think is best for America'
        };

const equalValue =
    this.conditionConfig.equalUnitsPerFamily;

const isEqualAllocation =
    Number.isInteger(equalValue) &&
    this.currentAllocation.every(
        value => value === equalValue
    );

const automaticPartialAllocation =
    mode === 'partial'
        ? this.buildAutomaticPartialAllocation()
        : null;

const isAutomaticPartialAllocation =
    automaticPartialAllocation !== null &&
    this.currentAllocation.every(
        (value, index) =>
            value === automaticPartialAllocation[index]
    );

this.addScreenText(
    640,
    13,
            boardTitles[mode],
            25,
            COLORS.ink,
            1180,
            'center'
        ).setOrigin(0.5, 0);

        this.addScreenText(
            640,
            47,
            this.conditionConfig.boardAvailableText,
            20,
            COLORS.ink,
            420,
            'center'
        ).setOrigin(0.5, 0);

        this.addScreenText(
            640,
            72,
            mode === 'self_interest' &&
this.gameData.selfInterestCondition === 'reveal'
    ? `Your income group is Decile ${this.gameData.respondentDecile}; its box is outlined in green.`
    : 'The number of income blocks is fixed; no additional blocks can be added.',
            14,
            COLORS.muted,
            1050,
            'center'
        ).setOrigin(0.5, 0);

        const startX = 68;
        const gap = 127;
        const cardTop = 100;
        const cardWidth = 112;
        const cardHeight = 445;
        const stackBottom = 520;

        const tallestStack = Math.max(...this.currentAllocation);
        const blockHeight = tallestStack > 42 ? 4 : 6;
        const blockGap = 1;

        const thresholdY = this.getThresholdY(
            stackBottom,
            blockHeight,
            blockGap
        );

        for (let index = 0; index < 10; index += 1)
        {
            const centerX = startX + index * gap;
            const amount = this.currentAllocation[index];
            const meetsNeed = amount >= NEED_PER_FAMILY;
            const selected = this.selectedSourceDecile === index;
            const isRespondentDecile =
    mode === 'self_interest' &&
    this.gameData.selfInterestCondition === 'reveal' &&
    index === this.gameData.respondentDecile - 1;

            const fillColor = selected
                ? COLORS.cardSelected
                : meetsNeed
                    ? COLORS.cardMet
                    : COLORS.cardBelow;

            const card = this.add.rectangle(
                centerX,
                cardTop + cardHeight / 2,
                cardWidth,
                cardHeight,
                fillColor
            );

            card.setStrokeStyle(
                selected || isRespondentDecile ? 4 : 2,
                selected
                    ? COLORS.resourceSelected
                    : isRespondentDecile
                        ? COLORS.respondentDecile
                        : COLORS.border
            );

            card.setInteractive({ useHandCursor: selected });
            this.addScreenObject(card);

            this.cardBounds[index] = new Phaser.Geom.Rectangle(
                centerX - cardWidth / 2,
                cardTop,
                cardWidth,
                cardHeight
            );

            card.on('pointerdown', () => {
                if (
                    this.selectedSourceDecile !== null &&
                    this.selectedSourceDecile !== index
                )
                {
                    this.moveOneUnit(
                        this.selectedSourceDecile,
                        index,
                        'click'
                    );
                }
            });

            this.drawFamilyGlyph(centerX, cardTop + 35, 0.38);

            this.addScreenText(
                centerX,
                cardTop + 67,
                `Decile ${index + 1}`,
                15,
                COLORS.ink,
                104,
                'center'
            ).setOrigin(0.5);

            this.addScreenText(
                centerX,
                cardTop + 89,
                this.formatIncome(amount),
                15,
                COLORS.ink,
                106,
                'center'
            ).setOrigin(0.5);

            this.addScreenText(
                centerX,
                cardTop + 112,
                `${amount} blocks`,
                13,
                COLORS.muted,
                102,
                'center'
            ).setOrigin(0.5);

            this.drawDraggableStack(
                index,
                centerX,
                stackBottom,
                amount,
                blockHeight,
                blockGap
            );
        }

        const thresholdLine = this.add.line(
            0,
            0,
            12,
            thresholdY,
            1268,
            thresholdY,
            COLORS.threshold,
            1
        ).setOrigin(0, 0);

        thresholdLine.setLineWidth(3);
        thresholdLine.setDepth(60);
        this.addScreenObject(thresholdLine);

        this.addScreenText(
            22,
            thresholdY - 22,
            '$50,000',
            14,
            '#6c3483',
            90,
            'left'
        ).setDepth(61);

        const meetingNeed = this.countFamiliesMeetingNeed(
            this.currentAllocation
        );

      let selectionMessage;

if (mode === 'equal')
{
    selectionMessage = isEqualAllocation
        ? `Income is now divided equally: ${equalValue} blocks per family.`
        : 'Select “Divide income equally” to see what equal division produces.';
}
else if (mode === 'partial')
{
    selectionMessage =
        isAutomaticPartialAllocation
            ? `${meetingNeed} of 10 families now have at least $50,000.`
            : 'Select “Redistribute to meet basic needs” to see the result.';
}
else
{
    selectionMessage =
        this.boardFeedbackMessage ||
        (
            this.selectedSourceDecile === null
                ? 'If you want to move income blocks, drag a block, or select a block and then select another family.'
                : `Decile ${this.selectedSourceDecile + 1} selected. Select another family to move one block.`
        );
}

        this.addScreenText(
            45,
            578,
            `${meetingNeed} of 10 families have at least $50,000`,
            21,
            COLORS.ink,
            470,
            'left'
        ).setOrigin(0, 0.5);

        this.addScreenText(
            640,
            612,
            selectionMessage,
            16,
            COLORS.muted,
            760,
            'center'
        ).setOrigin(0.5);

        if (mode !== 'self_interest')
        {
            this.addButton(
                480,
                675,
                180,
                50,
                'Reset',
                () => {
                    this.currentAllocation = [...this.initialAllocation];
                    this.selectedSourceDecile = null;
                    this.boardFeedbackMessage = '';

                    this.recordAction({
                        action: 'reset_allocation',
                        task: mode
                    });

                    this.redrawAllocationBoard();
                },
                COLORS.buttonLight,
                COLORS.ink
            );
        }

        if (mode === 'free')
        {
            this.addButton(
                800,
                675,
                290,
                50,
                'Submit this arrangement',
                () => {
                    this.showAllocationConfirmation();
                }
            );
        }
        else if (mode === 'equal')
        {
            if (isEqualAllocation)
            {
                this.addButton(
                    800,
                    675,
                    290,
                    50,
                    'Continue',
                    () => {
                        this.storeEqualDivision(this.currentAllocation);
                        this.showEqualDivisionOutcomeQuestion();
                    }
                );
            }
            else
            {
                this.addButton(
                    800,
                    675,
                    290,
                    50,
                    'Divide income equally',
                    () => {
                        const before = [...this.currentAllocation];

                        this.currentAllocation = new Array(
                            this.currentAllocation.length
                        ).fill(equalValue);

                        this.selectedSourceDecile = null;

                        this.recordAction({
                            action: 'apply_equal_division',
                            before,
                            allocation: [...this.currentAllocation]
                        });

                        this.redrawAllocationBoard();
                    }
                );
            }
        }
       else if (mode === 'partial')
{
    if (isAutomaticPartialAllocation)
    {
        this.addButton(
            800,
            675,
            290,
            50,
            'Continue',
            () => {
                this.storePartialRedistribution(
                    this.currentAllocation
                );

                this.showRedistributionQuestion(1);
            }
        );
    }
    else
    {
        this.addButton(
            800,
            675,
            320,
            50,
            'Redistribute to meet basic needs',
            () => {
                const before = [
                    ...this.currentAllocation
                ];

                this.currentAllocation = [
                    ...automaticPartialAllocation
                ];

                this.selectedSourceDecile = null;
                this.boardFeedbackMessage = '';

                this.recordAction({
    action:
        'apply_automatic_partial_redistribution',

    before,

    allocation: [
        ...this.currentAllocation
    ],

    recipientPriority:
        'highest_below_threshold_first',

    donorRule:
        'proportional_to_income_above_threshold'
});
                this.redrawAllocationBoard();
            }
        );
    }
}
else if (mode === 'self_interest')
{
    /*
     * Reset
     */
    this.addButton(
        120,
        675,
        160,
        50,
        'Reset',
        () => {
            this.currentAllocation = [
                ...this.initialAllocation
            ];

            this.selectedSourceDecile = null;
            this.boardFeedbackMessage = '';
            this.selfInterestEqualApplied = false;
            this.selfInterestPartialApplied = false;

            this.recordAction({
                action: 'reset_allocation',
                task: mode
            });

            this.redrawAllocationBoard();
        },
        COLORS.buttonLight,
        COLORS.ink
    );

    /*
     * Automatic partial redistribution
     */
    this.addButton(
        390,
        675,
        300,
        50,
        'Redistribute to meet basic needs',
        () => {
            const before = [
                ...this.currentAllocation
            ];

            this.currentAllocation =
                this.buildAutomaticPartialAllocation();

            this.selectedSourceDecile = null;

            this.boardFeedbackMessage =
                'Income above the basic-needs line has been partially redistributed.';

            this.selfInterestEqualApplied = false;
            this.selfInterestPartialApplied = true;

            this.recordAction({
                action:
                    'apply_automatic_partial_redistribution',
                task: mode,
                before,
                allocation: [
                    ...this.currentAllocation
                ],
                priority:
                    'highest_below_threshold_first'
            });

            this.redrawAllocationBoard();
        },
        COLORS.buttonLight,
        COLORS.ink
    );

    /*
     * Automatic equal redistribution
     */
    this.addButton(
        705,
        675,
        270,
        50,
        'Divide income equally',
        () => {
            const before = [
                ...this.currentAllocation
            ];

            this.currentAllocation =
                new Array(
                    this.currentAllocation.length
                ).fill(equalValue);

            this.selectedSourceDecile = null;

            this.boardFeedbackMessage =
                'Income has been divided equally among all 10 families.';

            this.selfInterestEqualApplied = true;
            this.selfInterestPartialApplied = false;

            this.recordAction({
                action: 'apply_equal_division',
                task: mode,
                before,
                allocation: [
                    ...this.currentAllocation
                ]
            });

            this.redrawAllocationBoard();
        },
        COLORS.buttonLight,
        COLORS.ink
    );

    /*
     * Submit
     */
    this.addButton(
        1060,
        675,
        300,
        50,
        'Submit this arrangement',
        () => {
            this.storeSelfInterestAllocation(
                this.currentAllocation
            );

            this.showManipulationCheck();
        }
    );
}

    }

    drawDraggableStack (
        decileIndex,
        centerX,
        stackBottom,
        amount,
        blockHeight,
        blockGap
    )
    {
        const blockWidth = 88;
        const cellHeight = blockHeight + blockGap;

        for (let unitIndex = 0; unitIndex < amount; unitIndex += 1)
        {
            const y = stackBottom - unitIndex * cellHeight;

            const resource = this.add.rectangle(
                centerX,
                y,
                blockWidth,
                blockHeight,
                COLORS.resource
            );

            resource.setStrokeStyle(1, COLORS.resourceBorder);
            resource.setDepth(20);
            this.addScreenObject(resource);

            const mayMoveThisBlock =
    this.allocationMode !== 'equal' &&
    this.allocationMode !== 'partial';

            if (!mayMoveThisBlock)
            {
                continue;
            }

            resource.setInteractive(
                new Phaser.Geom.Rectangle(
                    -blockWidth / 2 - 5,
                    -blockHeight / 2 - 9,
                    blockWidth + 10,
                    blockHeight + 18
                ),
                Phaser.Geom.Rectangle.Contains
            );

            resource.setData('sourceDecile', decileIndex);
            resource.setData('wasDragged', false);
            this.input.setDraggable(resource);

            resource.on('dragstart', () => {
                resource.setData('wasDragged', true);
                this.isDraggingResource = true;
                resource.setFillStyle(COLORS.resourceSelected);
                resource.setDepth(500);
            });

            resource.on('drag', (pointer, dragX, dragY) => {
                resource.x = dragX;
                resource.y = dragY - 12;
            });

            resource.on('dragend', pointer => {
                const source = resource.getData('sourceDecile');

                const destination = this.findCardAt(
                    pointer.worldX,
                    pointer.worldY
                );

                this.isDraggingResource = false;

                this.time.delayedCall(0, () => {
                    if (destination !== null && destination !== source)
                    {
                        this.moveOneUnit(source, destination, 'drag');
                    }
                    else
                    {
                        this.redrawAllocationBoard();
                    }
                });
            });

            resource.on('pointerup', () => {
                if (!resource.getData('wasDragged') && !this.isDraggingResource)
                {
                    this.selectedSourceDecile = decileIndex;
                    this.redrawAllocationBoard();
                }
            });
        }
    }

    findCardAt (x, y)
    {
        for (let index = 0; index < this.cardBounds.length; index += 1)
        {
            if (Phaser.Geom.Rectangle.Contains(this.cardBounds[index], x, y))
            {
                return index;
            }
        }

        return null;
    }

    moveOneUnit (source, destination, method)
    {
        const partialTransferWouldCrossNeedsLine =
            this.allocationMode === 'partial' &&
            this.currentAllocation[source] <= NEED_PER_FAMILY;

        if (
            source === destination ||
            source < 0 ||
            destination < 0 ||
            this.currentAllocation[source] <= 0 ||
            partialTransferWouldCrossNeedsLine
        )
        {
            if (partialTransferWouldCrossNeedsLine)
            {
                this.boardFeedbackMessage =
                    'Only income blocks above the basic-needs line may be moved in this task.';
            }

            if (this.allocationMode === 'self_interest')
{
    this.selfInterestEqualApplied = false;
    this.selfInterestPartialApplied = false;
}

            this.selectedSourceDecile = null;
            this.redrawAllocationBoard();
            return;
        }

        const sourceBefore = this.currentAllocation[source];
        const destinationBefore = this.currentAllocation[destination];

        this.currentAllocation[source] -= 1;
        this.currentAllocation[destination] += 1;
        this.selectedSourceDecile = null;
        this.boardFeedbackMessage = '';

        this.recordAction({
            action: 'transfer',
            task: this.allocationMode,
            method,
            units: 1,
            sourceDecile: source + 1,
            destinationDecile: destination + 1,
            sourceBefore,
            sourceAfter: this.currentAllocation[source],
            destinationBefore,
            destinationAfter: this.currentAllocation[destination]
        });

        this.redrawAllocationBoard();
    }

    showAllocationConfirmation ()
    {
        const submittedAllocation = [...this.currentAllocation];
        const meetingNeed = this.countFamiliesMeetingNeed(submittedAllocation);

        this.enterScreen('free_allocation_confirmation');
        this.clearScreen();
        this.addPanel(640, 360, 980, 510);

        this.addScreenText(
            640,
            145,
            'Submit this arrangement?',
            38,
            COLORS.ink,
            850,
            'center'
        ).setOrigin(0.5);

        this.addScreenText(
            640,
            270,
            `${meetingNeed} of 10 families have at least $50,000.`,
            29,
            COLORS.ink,
            820,
            'center'
        ).setOrigin(0.5);

        this.addScreenText(
            640,
            350,
            `Income blocks by decile: ${submittedAllocation.join(' – ')}`,
            21,
            COLORS.muted,
            850,
            'center'
        ).setOrigin(0.5);

        this.addButton(
            465,
            540,
            230,
            56,
            'Return to board',
            () => {
                this.enterScreen('free_allocation_board');
                this.redrawAllocationBoard();
            },
            COLORS.buttonLight,
            COLORS.ink
        );

        this.addButton(815, 540, 230, 56, 'Submit', () => {
            this.storeFreeAllocation(submittedAllocation);
            this.startEqualDivisionTask();
        });
    }

    storeFreeAllocation (allocation)
    {
        const meetingNeed = this.countFamiliesMeetingNeed(allocation);

        const totalMoved = allocation.reduce(
            (sum, value, index) =>
                sum + Math.abs(value - this.initialAllocation[index]),
            0
        ) / 2;

        this.gameData.freeAllocationFinal = [...allocation];
        this.gameData.freeAllocationFamiliesMeetingNeed = meetingNeed;
        this.gameData.freeAllocationGini = this.calculateGini(allocation);
        this.gameData.freeAllocationTotalMoved = totalMoved;
        this.gameData.freeAllocationClassification =
            this.classifyAllocation(allocation);

        if (this.gameData.respondentDecile !== null)
        {
            const respondentIndex = this.gameData.respondentDecile - 1;

            this.gameData.respondentFreeAllocationChange =
                allocation[respondentIndex] -
                this.initialAllocation[respondentIndex];
        }

        this.recordAction({
            action: 'submit_free_allocation',
            allocation: [...allocation],
            familiesMeetingNeed: meetingNeed,
            gini: this.gameData.freeAllocationGini,
            totalMoved,
            classification: this.gameData.freeAllocationClassification
        });
    }

    startEqualDivisionTask ()
    {
        this.allocationMode = 'equal';
        this.currentAllocation = [...this.initialAllocation];
        this.selectedSourceDecile = null;
        this.boardFeedbackMessage = '';
        this.enterScreen('equal_division_board');
        this.redrawAllocationBoard();
    }

    storeEqualDivision (allocation)
    {
        const finalAllocation = [...allocation];
        const meetingNeed = this.countFamiliesMeetingNeed(finalAllocation);

        this.gameData.equalDivisionFinal = finalAllocation;
        this.gameData.equalDivisionFamiliesMeetingNeed = meetingNeed;

        this.recordAction({
            action: 'complete_equal_division',
            allocation: finalAllocation,
            familiesMeetingNeed: meetingNeed
        });
    }

    showEqualDivisionOutcomeQuestion ()
    {
        this.enterScreen('equal_division_outcome_question');
        this.clearScreen();
        this.addPanel(640, 360, 1000, 520);

        this.addScreenText(
            640,
            160,
            'After dividing the income equally, how many of the 10 families had at least $50,000?',
            29,
            COLORS.ink,
            900,
            'center'
        ).setOrigin(0.5);

        const choices = [
            { value: 0, label: '0 families' },
            { value: 8, label: '8 families' },
            { value: 10, label: '10 families' }
        ];

        choices.forEach((choice, index) => {
            this.addButton(
                640,
                315 + index * 76,
                360,
                52,
                choice.label,
                () => {
                    this.gameData.equalDivisionOutcomeChoice = choice.value;
                    this.gameData.equalDivisionOutcomePassed =
                        choice.value ===
                        this.conditionConfig.equalFamiliesMeetingNeed;

                    this.recordAnswer(
                        'equal_division_outcome',
                        choice.value
                    );

                    this.showRedistributionQuestion(0);
                },
                COLORS.buttonLight,
                COLORS.ink
            );
        });
    }

    showPartialRedistributionInstructions ()
{
    this.enterScreen(
        'partial_redistribution_instructions'
    );

    this.clearScreen();
    this.addPanel(640, 360, 1080, 560);

    this.addScreenText(
        640,
        125,
        'Next, you will see what happens when income above the basic-needs line is partially redistributed.',
        29,
        COLORS.ink,
        930,
        'center'
    ).setOrigin(0.5);

    this.addScreenText(
        640,
        285,
        'The redistribution begins with the highest-income family below the line and then works down toward lower-income families. Each family keeps all income blocks at or below the basic-needs line.',
        24,
        COLORS.ink,
        920,
        'center'
    ).setOrigin(0.5);

    this.addScreenText(
        640,
        455,
        CLOSED_POOL_TEXT,
        18,
        COLORS.muted,
        920,
        'center'
    ).setOrigin(0.5);

    this.addButton(
        640,
        600,
        220,
        56,
        'Continue',
        () => {
            this.startPartialRedistributionTask();
        }
    );
}

buildAutomaticPartialAllocation ()
{
    const allocation = [
        ...this.initialAllocation
    ];

    /*
     * Identify families that begin above the
     * basic-needs line and calculate their surplus.
     */
    const donors = this.initialAllocation
        .map((amount, index) => {
            return {
                index,
                surplus: Math.max(
                    0,
                    amount - NEED_PER_FAMILY
                )
            };
        })
        .filter(donor => donor.surplus > 0);

    const totalAvailableSurplus = donors.reduce(
        (sum, donor) =>
            sum + donor.surplus,
        0
    );

    let remainingSurplus =
        totalAvailableSurplus;

    let totalTransferRequired = 0;

    /*
     * Begin with the highest-income family below
     * the line and work downward. Transfer income
     * only when enough is available to bring the
     * family fully to the basic-needs line.
     */
    for (
        let recipient = allocation.length - 1;
        recipient >= 0;
        recipient -= 1
    )
    {
        if (
            this.initialAllocation[recipient] >=
            NEED_PER_FAMILY
        )
        {
            continue;
        }

        const deficit =
            NEED_PER_FAMILY -
            this.initialAllocation[recipient];

        if (deficit <= remainingSurplus)
        {
            allocation[recipient] =
                NEED_PER_FAMILY;

            remainingSurplus -= deficit;
            totalTransferRequired += deficit;
        }
    }

    if (
        totalTransferRequired === 0 ||
        totalAvailableSurplus === 0
    )
    {
        return allocation;
    }

    /*
     * Divide the required contribution among
     * donors in proportion to the income each
     * holds above the basic-needs line.
     */
    const contributionShares = donors.map(
        donor => {
            const exactContribution =
                (
                    donor.surplus /
                    totalAvailableSurplus
                ) *
                totalTransferRequired;

            const baseContribution =
                Math.floor(exactContribution);

            return {
                ...donor,

                contribution: Math.min(
                    baseContribution,
                    donor.surplus
                ),

                remainder:
                    exactContribution -
                    baseContribution
            };
        }
    );

    let assignedContributions =
        contributionShares.reduce(
            (sum, donor) =>
                sum + donor.contribution,
            0
        );

    /*
     * Assign any remaining whole blocks using
     * the largest-remainder method.
     */
    contributionShares.sort(
        (donorA, donorB) =>
            donorB.remainder -
                donorA.remainder ||
            donorB.surplus -
                donorA.surplus ||
            donorB.index -
                donorA.index
    );

    let donorCursor = 0;

    while (
        assignedContributions <
        totalTransferRequired
    )
    {
        const donor =
            contributionShares[
                donorCursor %
                contributionShares.length
            ];

        if (
            donor.contribution <
            donor.surplus
        )
        {
            donor.contribution += 1;
            assignedContributions += 1;
        }

        donorCursor += 1;
    }

    contributionShares.forEach(donor => {
        allocation[donor.index] -=
            donor.contribution;
    });

    return allocation;
}

    startPartialRedistributionTask ()
    {
        this.allocationMode = 'partial';
        this.currentAllocation = [...this.initialAllocation];
        this.selectedSourceDecile = null;
        this.boardFeedbackMessage = '';
        this.enterScreen('partial_redistribution_board');
        this.redrawAllocationBoard();
    }

    storePartialRedistribution (allocation)
    {
        const finalAllocation = [...allocation];
        const meetingNeed = this.countFamiliesMeetingNeed(finalAllocation);

        const maximumPossible =
            this.conditionConfig.partialMaximumFamilies;

        const totalMoved = finalAllocation.reduce(
            (sum, value, index) =>
                sum + Math.abs(value - this.initialAllocation[index]),
            0
        ) / 2;

        this.gameData.partialRedistributionFinal = finalAllocation;
        this.gameData.partialRedistributionFamiliesMeetingNeed = meetingNeed;
        this.gameData.partialRedistributionMaximumPossible = maximumPossible;
        this.gameData.partialRedistributionReachedMaximum =
            meetingNeed === maximumPossible;
        this.gameData.partialRedistributionTotalMoved = totalMoved;

        this.recordAction({
            action: 'complete_partial_redistribution',
            allocation: finalAllocation,
            familiesMeetingNeed: meetingNeed,
            maximumPossible,
            reachedMaximum: meetingNeed === maximumPossible,
            totalMoved
        });
    }

    showRedistributionQuestion (questionIndex)
{
    if (questionIndex >= REDISTRIBUTION_QUESTIONS.length)
    {
        this.showEconomicPrinciple(0);
        return;
    }

    const question = REDISTRIBUTION_QUESTIONS[questionIndex];

    this.enterScreen(`redistribution_${question.code}`);
    this.clearScreen();
    this.addPanel(640, 360, 1120, 610);

    this.addScreenText(
        640,
        135,
        question.prompt,
        26,
        COLORS.ink,
        1000,
        'center'
    ).setOrigin(0.5);

    this.addScreenText(
        640,
        245,
        CLOSED_POOL_TEXT,
        18,
        COLORS.muted,
        1000,
        'center'
    ).setOrigin(0.5);

    const orderedOptions = this.getOrderedOptions(
        question.code,
        question.options,
        this.gameData.redistributionOptionOrders
    );

    orderedOptions.forEach((option, index) => {
        const centerY = 365 + index * 175;

        this.addLargeChoice(
            centerY,
            option.title,
            option.detail,
            () => {
                this.gameData.redistributionChoices[question.code] =
                    option.code;

                this.recordAnswer(
                    question.code,
                    option.code
                );

                if (question.code === 'equal_redistribution')
                {
                    this.showPartialRedistributionInstructions();
                }
                else
                {
                    this.showRedistributionQuestion(
                        questionIndex + 1
                    );
                }
            }
        );
    });
}

    showEconomicPrinciple (principleIndex)
    {
        if (principleIndex >= ECONOMIC_PRINCIPLES.length)
{
    this.showSelfInterestRandomizationScreen();
    return;
}

        const principle = ECONOMIC_PRINCIPLES[principleIndex];

        this.enterScreen(`economic_principle_${principle.code}`);
        this.clearScreen();

        this.addScreenText(
            640,
            35,
            principle.prompt,
            27,
            COLORS.ink,
            1130,
            'center'
        ).setOrigin(0.5, 0);

        this.addScreenText(
            1215,
            690,
            `${principleIndex + 1} of ${ECONOMIC_PRINCIPLES.length}`,
            15,
            COLORS.muted,
            100,
            'right'
        ).setOrigin(1, 0.5);

        const orderedOptions = this.getOrderedOptions(
            principle.code,
            principle.options,
            this.gameData.economicPrincipleOptionOrders
        );

        orderedOptions.forEach((option, index) => {
            const centerX = index === 0 ? 330 : 950;

            this.drawPrincipleChoice(
                centerX,
                principle.code,
                option,
                () => {
                    this.gameData.economicPrinciples[principle.code] =
                        option.code;

                    this.recordAnswer(
                        `economic_principle_${principle.code}`,
                        option.code
                    );

                    this.showEconomicPrinciple(principleIndex + 1);
                }
            );
        });
    }

    showSelfInterestRandomizationScreen ()
{
    if (!this.gameData.selfInterestCondition)
    {
        this.gameData.selfInterestCondition =
            this.assignSelfInterestCondition();

        this.recordAction({
            action:
                'assign_self_interest_condition',
            condition:
                this.gameData.selfInterestCondition
        });
    }

    if (
        this.gameData.selfInterestCondition ===
        'reveal'
    )
    {
        this.showRespondentDecileScreen();
    }
    else
    {
        this.showNeutralSelfInterestScreen();
    }
}

showNeutralSelfInterestScreen ()
{
    this.enterScreen(
        'self_interest_neutral_screen'
    );

    this.clearScreen();

    this.gameData.respondentDecileRevealed = false;

    this.addScreenText(
        640,
        35,
        'You will complete one final income task',
        31,
        COLORS.ink,
        1080,
        'center'
    ).setOrigin(0.5, 0);

    this.addScreenText(
        640,
        88,
        'You will now see the same ten income groups again.',
        22,
        COLORS.ink,
        1040,
        'center'
    ).setOrigin(0.5, 0);

    this.addScreenText(
        640,
        145,
        'In this scenario, the income shown is the average for each income decile.',
        18,
        COLORS.muted,
        1040,
        'center'
    ).setOrigin(0.5, 0);

    this.drawStaticTenDecileDistribution(
        195,
        365
    );

    this.addButton(
        640,
        665,
        210,
        50,
        'Continue',
        () => {
            this.startSelfInterestAllocation();
        }
    );
}

    showRespondentDecileScreen ()
    {
        this.enterScreen('respondent_decile_reveal');
        this.clearScreen();

        this.gameData.respondentDecileRevealed = true;

        this.addScreenText(
            640,
            35,
            `Your approximate income group is Decile ${this.gameData.respondentDecile} of 10`,
            31,
            COLORS.ink,
            1080,
            'center'
        ).setOrigin(0.5, 0);

        this.addScreenText(
            640,
            88,
            'This estimate is based on the household income and household size you reported earlier in the survey.',
            22,
            COLORS.ink,
            1040,
            'center'
        ).setOrigin(0.5, 0);

        this.addScreenText(
            640,
            145,
            'The green outline marks your approximate income group. The income shown is the average for that decile, not your reported income.',
            18,
            COLORS.muted,
            1040,
            'center'
        ).setOrigin(0.5, 0);

        this.drawStaticTenDecileDistribution(
            195,
            365,
            this.gameData.respondentDecile
        );

        this.addButton(
            640,
            665,
            210,
            50,
            'Continue',
            () => {
                this.startSelfInterestAllocation();
            }
        );
    }

    startSelfInterestAllocation ()
    {
        this.allocationMode = 'self_interest';
        this.currentAllocation = [...this.initialAllocation];
        this.selectedSourceDecile = null;
        this.boardFeedbackMessage = '';
        this.selfInterestEqualApplied = false;
        this.selfInterestPartialApplied = false;
        this.enterScreen('self_interest_allocation_board');
        this.redrawAllocationBoard();
    }

    storeSelfInterestAllocation (allocation)
    {
        const finalAllocation = [...allocation];
        const respondentIndex = this.gameData.respondentDecile - 1;
        const meetingNeed = this.countFamiliesMeetingNeed(finalAllocation);

        const totalMoved = finalAllocation.reduce(
            (sum, value, index) =>
                sum + Math.abs(value - this.initialAllocation[index]),
            0
        ) / 2;

        this.gameData.selfInterestAllocationFinal = finalAllocation;
        this.gameData.selfInterestAllocationFamiliesMeetingNeed = meetingNeed;
        this.gameData.selfInterestAllocationGini =
            this.calculateGini(finalAllocation);
        this.gameData.selfInterestAllocationClassification =
            this.classifyAllocation(finalAllocation);
        this.gameData.selfInterestAllocationTotalMoved = totalMoved;
        this.gameData.selfInterestOwnStartingBlocks =
            this.initialAllocation[respondentIndex];
        this.gameData.selfInterestOwnFinalBlocks =
            finalAllocation[respondentIndex];
        this.gameData.selfInterestOwnChange =
            finalAllocation[respondentIndex] -
            this.initialAllocation[respondentIndex];
        this.gameData.selfInterestEqualButtonUsed =
            this.selfInterestEqualApplied;
            this.gameData.selfInterestPartialButtonUsed =
    this.selfInterestPartialApplied;

this.recordAction({
    action: 'submit_self_interest_allocation',
    selfInterestCondition:
        this.gameData.selfInterestCondition,
    respondentDecileRevealed:
        this.gameData.respondentDecileRevealed,
    respondentDecile:
        this.gameData.respondentDecile,
    allocation: finalAllocation,
    respondentStartingBlocks:
        this.gameData.selfInterestOwnStartingBlocks,
    respondentFinalBlocks:
        this.gameData.selfInterestOwnFinalBlocks,
    respondentChange:
        this.gameData.selfInterestOwnChange,
    familiesMeetingNeed: meetingNeed,
    gini: this.gameData.selfInterestAllocationGini,
    totalMoved,
    classification:
        this.gameData.selfInterestAllocationClassification,
    equalButtonUsed:
        this.gameData.selfInterestEqualButtonUsed,
    partialButtonUsed:
        this.gameData.selfInterestPartialButtonUsed
});
    }

    drawPrincipleChoice (centerX, principleCode, option, callback)
    {
        const box = this.add.rectangle(
            centerX,
            395,
            560,
            500,
            COLORS.panel
        );

        box.setStrokeStyle(2, COLORS.border);
        box.setInteractive({ useHandCursor: true });
        this.addScreenObject(box);

        this.addScreenText(
            centerX,
            175,
            option.title,
            27,
            COLORS.ink,
            500,
            'center'
        ).setOrigin(0.5);

        this.drawPrincipleVisualization(
            principleCode,
            option.code,
            centerX,
            345
        );

        this.addScreenText(
            centerX,
            505,
            option.detail,
            20,
            COLORS.ink,
            490,
            'center'
        ).setOrigin(0.5);

        this.addScreenText(
            centerX,
            610,
            'Select this option',
            17,
            COLORS.muted,
            300,
            'center'
        ).setOrigin(0.5);

        box.on('pointerdown', callback);
    }

    drawPrincipleVisualization (principleCode, optionCode, centerX, centerY)
    {
        if (principleCode === 'responsibility')
{
    const offsets = [-115, 0, 115];
    const pileSizes = [2, 5, 8];

    offsets.forEach((offset, index) => {
        this.drawFamilyGlyph(
            centerX + offset,
            centerY - 50,
            0.48
        );

        this.drawBlockStack(
            centerX + offset,
            centerY + 60,
            pileSizes[index],
            52,
            7,
            3
        );
    });

    if (optionCode === 'shared')
    {
        this.addArrowText(
            centerX - 58,
            centerY + 25,
            '←'
        );

        this.addArrowText(
            centerX + 58,
            centerY + 25,
            '←'
        );

        this.addScreenText(
            centerX,
            centerY + 115,
            'Income transfers between families',
            16,
            COLORS.muted,
            310,
            'center'
        ).setOrigin(0.5);
    }
    else
    {
        this.addScreenText(
            centerX,
            centerY + 115,
            'Each family keeps its own income',
            16,
            COLORS.muted,
            310,
            'center'
        ).setOrigin(0.5);
    }

    return;
}
        if (principleCode === 'fairness')
{
    if (optionCode === 'equity')
    {
        this.addVisualSymbol(
            centerX - 105,
            centerY - 5,
            'EQUAL\nCHANCE'
        );

        this.drawBlockStack(
            centerX + 100,
            centerY + 45,
            5,
            60,
            7,
            3
        );

        this.addArrowText(
            centerX,
            centerY,
            '→'
        );
    }
    else if (optionCode === 'proportionality')
    {
        this.addVisualSymbol(
            centerX - 105,
            centerY - 5,
            'HARD\nWORK'
        );

        this.drawBlockStack(
            centerX + 100,
            centerY + 45,
            5,
            60,
            7,
            3
        );

        this.addArrowText(
            centerX,
            centerY,
            '→'
        );
    }

    return;
}

        if (principleCode === 'time')
        {
            this.drawBlockStack(
                centerX - 105,
                centerY + 35,
                5,
                60,
                7,
                3
            );

            this.addArrowText(centerX, centerY, '→');

            if (optionCode === 'future')
            {
                this.addVisualSymbol(centerX + 105, centerY, 'FUTURE');

                this.addScreenText(
                    centerX + 105,
                    centerY + 80,
                    'Benefits later',
                    17,
                    COLORS.muted,
                    170,
                    'center'
                ).setOrigin(0.5);
            }
            else
            {
                this.addVisualSymbol(centerX + 105, centerY, 'NOW');

                this.addScreenText(
                    centerX + 105,
                    centerY + 80,
                    'Production today',
                    17,
                    COLORS.muted,
                    170,
                    'center'
                ).setOrigin(0.5);
            }

            return;
        }

        if (principleCode === 'scope')
        {
            this.addVisualSymbol(centerX - 110, centerY, 'U.S.');
            this.addArrowText(centerX, centerY, '→');

            if (optionCode === 'international')
            {
                this.addVisualSymbol(centerX + 110, centerY, 'WORLD');
            }
            else
            {
                this.drawFamilyGlyph(centerX + 110, centerY, 0.65);
            }

            this.drawBlockStack(
                centerX,
                centerY + 105,
                5,
                58,
                7,
                3
            );

            return;
        }

        if (principleCode === 'strategy')
        {
            if (optionCode === 'cooperate')
            {
                this.drawFamilyGlyph(
                    centerX - 135,
                    centerY - 45,
                    0.48
                );

                this.drawFamilyGlyph(
                    centerX + 135,
                    centerY - 45,
                    0.48
                );

                this.drawFamilyGlyph(
                    centerX,
                    centerY - 105,
                    0.48
                );

                this.addVisualSymbol(
                    centerX,
                    centerY + 35,
                    'SHARED\nGOAL'
                );

                this.addArrowText(
                    centerX - 72,
                    centerY - 5,
                    '↘'
                );

                this.addArrowText(
                    centerX + 72,
                    centerY - 5,
                    '↙'
                );

                this.addArrowText(
                    centerX,
                    centerY - 42,
                    '↓'
                );
            }
            else
            {
                this.drawFamilyGlyph(
                    centerX - 135,
                    centerY - 45,
                    0.48
                );

                this.drawFamilyGlyph(
                    centerX + 135,
                    centerY - 45,
                    0.48
                );

                this.drawFamilyGlyph(
                    centerX,
                    centerY - 105,
                    0.48
                );

                this.drawBlockStack(
                    centerX,
                    centerY + 75,
                    7,
                    72,
                    7,
                    3
                );

                this.addArrowText(
                    centerX - 72,
                    centerY,
                    '↘'
                                    );

                this.addArrowText(
                    centerX + 72,
                    centerY,
                    '↙'
                );

                this.addArrowText(
                    centerX,
                    centerY - 42,
                    '↓'
                );

                this.addScreenText(
                    centerX,
                    centerY + 115,
                    'The same income',
                    16,
                    COLORS.muted,
                    180,
                    'center'
                ).setOrigin(0.5);
            }
        }
    }

    drawStaticTenDecileDistribution (
        cardTop,
        cardHeight,
        highlightedDecile = null
    )
    {
        const startX = 68;
        const gap = 127;
        const cardWidth = 112;
        const stackBottom = cardTop + cardHeight - 32;
        const blockHeight = 4;
        const blockGap = 1;

        const thresholdY = this.getThresholdY(
            stackBottom,
            blockHeight,
            blockGap
        );

        for (let index = 0; index < 10; index += 1)
        {
            const centerX = startX + index * gap;
            const amount = this.initialAllocation[index];
            const isHighlighted = highlightedDecile === index + 1;

            const card = this.add.rectangle(
                centerX,
                cardTop + cardHeight / 2,
                cardWidth,
                cardHeight,
                amount >= NEED_PER_FAMILY
                    ? COLORS.cardMet
                    : COLORS.cardBelow
            );

            card.setStrokeStyle(
                isHighlighted ? 5 : 2,
                isHighlighted
                    ? COLORS.respondentDecile
                    : COLORS.border
            );
            this.addScreenObject(card);
            this.drawFamilyGlyph(centerX, cardTop + 31, 0.36);

            this.addScreenText(
                centerX,
                cardTop + 62,
                `Decile ${index + 1}`,
                14,
                COLORS.ink,
                105,
                'center'
            ).setOrigin(0.5);

            this.addScreenText(
                centerX,
                cardTop + 84,
                this.formatIncome(amount),
                14,
                COLORS.ink,
                106,
                'center'
            ).setOrigin(0.5);

            this.drawBlockStack(
                centerX,
                stackBottom,
                amount,
                74,
                blockHeight,
                blockGap
            );
        }

        const thresholdLine = this.add.line(
            0,
            0,
            12,
            thresholdY,
            1268,
            thresholdY,
            COLORS.threshold,
            1
        ).setOrigin(0, 0);

        thresholdLine.setLineWidth(3);
        thresholdLine.setDepth(60);
        this.addScreenObject(thresholdLine);

        this.addScreenText(
            20,
            thresholdY - 22,
            '$50,000',
            14,
            '#6c3483',
            90,
            'left'
        ).setDepth(61);
    }

    drawExampleIncomeCard (
        centerX,
        topY,
        width,
        height,
        amount,
        label,
        alpha = 1,
        displayIncome = null,
        comparisonText = null
    )
    {
        const card = this.add.rectangle(
            centerX,
            topY + height / 2,
            width,
            height,
            amount >= NEED_PER_FAMILY
                ? COLORS.cardMet
                : COLORS.cardBelow
        );

        card.setStrokeStyle(2, COLORS.border);
        card.setAlpha(alpha);
        this.addScreenObject(card);

        this.drawFamilyGlyph(centerX, topY + 52, 0.72, alpha);

        this.addScreenText(
            centerX,
            topY + 102,
            label,
            21,
            COLORS.ink,
            width - 30,
            'center'
        ).setOrigin(0.5).setAlpha(alpha);

        const incomeText = displayIncome || this.formatIncome(amount);
        const annualIncomeText = /per year/i.test(incomeText)
            ? incomeText
            : `${incomeText} per year`;

        this.addScreenText(
            centerX,
            topY + 132,
            annualIncomeText,
            20,
            COLORS.ink,
            width - 30,
            'center'
        ).setOrigin(0.5).setAlpha(alpha);

        if (comparisonText)
        {
            this.addScreenText(
                centerX,
                topY + 165,
                comparisonText,
                18,
                COLORS.ink,
                width - 32,
                'center'
            ).setOrigin(0.5).setAlpha(alpha);
        }

        const stackBottom = topY + height - 22;
        const blockHeight = 4;
        const blockGap = 1;

        const thresholdY = this.getThresholdY(
            stackBottom,
            blockHeight,
            blockGap
        );

        this.drawBlockStack(
            centerX,
            stackBottom,
            amount,
            Math.min(130, width - 60),
            blockHeight,
            blockGap,
            COLORS.resource,
            alpha
        );

        const line = this.add.line(
            0,
            0,
            centerX - width / 2 + 15,
            thresholdY,
            centerX + width / 2 - 15,
            thresholdY,
            COLORS.threshold,
            alpha
        ).setOrigin(0, 0);

        line.setLineWidth(3);
        line.setDepth(60);
        this.addScreenObject(line);

        this.addScreenText(
            centerX + width / 2 - 18,
            thresholdY - 20,
            '$50,000',
            13,
            '#6c3483',
            80,
            'right'
        ).setOrigin(1, 0).setAlpha(alpha).setDepth(61);
    }

    drawFamilyWithBlocks (centerX, centerY, amount, scale)
    {
        this.drawFamilyGlyph(centerX, centerY - 85, scale);
        this.drawBlockStack(
            centerX,
            centerY + 90,
            amount,
            86,
            6,
            3
        );
    }

    drawBasicNeedsLine (startX, endX, y, label)
    {
        const line = this.add.line(
            0,
            0,
            startX,
            y,
            endX,
            y,
            COLORS.threshold,
            1
        ).setOrigin(0, 0);

        line.setLineWidth(4);
        line.setDepth(60);
        this.addScreenObject(line);

        this.addScreenText(
            endX - 4,
            y - 26,
            label,
            16,
            '#6c3483',
            180,
            'right'
        ).setOrigin(1, 0).setDepth(61);
    }

        drawFamilyGlyph (centerX, centerY, scale = 1, alpha = 1)
    {
        const graphics = this.add.graphics();
        graphics.setAlpha(alpha);

        const silhouette = 0x111111;
        graphics.fillStyle(silhouette, 1);

        const drawPerson = (xOffset, size) => {
            const isAdult = size === 'adult';
            const x = centerX + xOffset * scale;
            const headRadius = (isAdult ? 8 : 6) * scale;
            const headY = centerY + (isAdult ? -28 : -13) * scale;
            const torsoTop = centerY + (isAdult ? -17 : -4) * scale;
            const torsoWidth = (isAdult ? 19 : 14) * scale;
            const torsoHeight = (isAdult ? 35 : 24) * scale;
            const legTop = torsoTop + torsoHeight - 3 * scale;
            const legWidth = (isAdult ? 7 : 5) * scale;
            const legHeight = (isAdult ? 24 : 18) * scale;
            const armStartY = torsoTop + 6 * scale;
            const armEndY = torsoTop + (isAdult ? 25 : 19) * scale;
            const armReach = (isAdult ? 17 : 12) * scale;

            graphics.fillCircle(x, headY, headRadius);

            // Neutral, straight-sided torso
            graphics.fillRoundedRect(
                x - torsoWidth / 2,
                torsoTop,
                torsoWidth,
                torsoHeight,
                4 * scale
            );

            // Legs
            graphics.fillRoundedRect(
                x - legWidth - 1.5 * scale,
                legTop,
                legWidth,
                legHeight,
                2.5 * scale
            );

            graphics.fillRoundedRect(
                x + 1.5 * scale,
                legTop,
                legWidth,
                legHeight,
                2.5 * scale
            );

            // Arms
            graphics.lineStyle(
                Math.max(2, (isAdult ? 6 : 5) * scale),
                silhouette,
                1
            );

            graphics.lineBetween(
                x - torsoWidth / 2 + 2 * scale,
                armStartY,
                x - armReach,
                armEndY
            );

            graphics.lineBetween(
                x + torsoWidth / 2 - 2 * scale,
                armStartY,
                x + armReach,
                armEndY
            );
        };

        drawPerson(-43, 'child');
        drawPerson(-15, 'adult');
        drawPerson(15, 'adult');
        drawPerson(43, 'child');

        this.addScreenObject(graphics);
        return graphics;
    }
    drawBlockStack (
        centerX,
        bottomY,
        amount,
        blockWidth = 70,
        blockHeight = 7,
        gap = 3,
        color = COLORS.resource,
        alpha = 1
    )
    {
        for (let index = 0; index < amount; index += 1)
        {
            const block = this.add.rectangle(
                centerX,
                bottomY - index * (blockHeight + gap),
                blockWidth,
                blockHeight,
                color
            );

            block.setAlpha(alpha);
            this.addScreenObject(block);
        }
    }

    addArrowText (x, y, arrow)
    {
        return this.addScreenText(
            x,
            y,
            arrow,
            35,
            COLORS.muted,
            60,
            'center'
        ).setOrigin(0.5);
    }

    addVisualSymbol (centerX, centerY, label)
    {
        const circle = this.add.circle(
            centerX,
            centerY,
            55,
            COLORS.card
        );

        circle.setStrokeStyle(3, COLORS.border);
        this.addScreenObject(circle);

        this.addScreenText(
            centerX,
            centerY,
            label,
            label.length > 4 ? 18 : 24,
            COLORS.ink,
            95,
            'center'
        ).setOrigin(0.5);
    }

    getThresholdY (stackBottom, blockHeight, blockGap)
    {
        return stackBottom -
            (NEED_PER_FAMILY - 1) * (blockHeight + blockGap) -
            blockHeight / 2 -
            1;
    }

    formatIncome (units)
    {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0
        }).format(units * DOLLARS_PER_UNIT);
    }

    addLargeChoice (centerY, title, detail, callback)
    {
        const box = this.add.rectangle(
            640,
            centerY,
            1000,
            135,
            COLORS.card
        );

        box.setStrokeStyle(2, COLORS.border);
        box.setInteractive({ useHandCursor: true });
        this.addScreenObject(box);

        this.addScreenText(
            175,
            centerY - 40,
            title,
            24,
            COLORS.ink,
            920,
            'left'
        ).setOrigin(0, 0);

        this.addScreenText(
            175,
            centerY - 2,
            detail,
            19,
            COLORS.muted,
            920,
            'left'
        ).setOrigin(0, 0);

        box.on('pointerdown', callback);
    }

    getOrderedOptions (questionCode, options, orderStore)
    {
        if (!orderStore[questionCode])
        {
            orderStore[questionCode] = Phaser.Utils.Array.Shuffle(
                options.map(option => option.code)
            );
        }

        return orderStore[questionCode].map(
            code => options.find(option => option.code === code)
        );
    }

    countFamiliesMeetingNeed (allocation)
    {
        return allocation.filter(
            value => value >= NEED_PER_FAMILY
        ).length;
    }

    classifyAllocation (allocation)
    {
        const unchanged = allocation.every(
            (value, index) =>
                value === this.initialAllocation[index]
        );

        if (unchanged)
        {
            return 'starting_distribution';
        }

        const equalValue =
            this.totalUnits / allocation.length;

        const equal = allocation.every(
            value => value === equalValue
        );

        if (equal)
        {
            return 'equal_distribution';
        }

        const maximumPossible = Math.min(
            allocation.length,
            Math.floor(this.totalUnits / NEED_PER_FAMILY)
        );

        if (
            this.countFamiliesMeetingNeed(allocation) ===
            maximumPossible
        )
        {
            return 'maximum_basic_needs_attainment';
        }

        return 'other_distribution';
    }

    calculateGini (values)
    {
        const count = values.length;
        const total = values.reduce(
            (sum, value) => sum + value,
            0
        );

        if (count === 0 || total === 0)
        {
            return 0;
        }

        let absoluteDifferenceSum = 0;

        values.forEach(valueA => {
            values.forEach(valueB => {
                absoluteDifferenceSum += Math.abs(
                    valueA - valueB
                );
            });
        });

        return Number(
            (
                absoluteDifferenceSum /
                (2 * count * total)
            ).toFixed(4)
        );
    }

showFinalScreen ()
{
    this.enterScreen('final_screen');
    this.finishCurrentScreen();
    this.clearScreen();

    this.gameData.gameEndTime = new Date().toISOString();

    this.gameData.totalDurationMs = Math.round(
        performance.now() -
        this.sessionStartPerformance
    );

    this.gameData.saveStatus = 'attempted';

    this.addPanel(
        640,
        360,
        970,
        470
    );

    this.addScreenText(
        640,
        245,
        'Thank you for completing the American Economy Task.',
        34,
        COLORS.ink,
        820,
        'center'
    ).setOrigin(0.5);

    const statusText = this.addScreenText(
        640,
        340,
        'Saving your responses…',
        25,
        COLORS.muted,
        780,
        'center'
    ).setOrigin(0.5);

    this.saveGameData()
        .then(() => {
            this.gameData.saveStatus = 'confirmed';
            this.gameData.saveAcknowledged = true;

            statusText.setText(
                'Your responses have been saved and confirmed.'
            );

            this.sendSurveyBackup('confirmed');
            this.addFinalCloseControls();
        })
        .catch(error => {
            this.gameData.saveStatus = 'unconfirmed';
            this.gameData.saveAcknowledged = false;
            this.gameData.saveError = String(error);

            const localBackupSaved = this.persistLocalBackup();
            const surveyBackupSent =
                this.sendSurveyBackup('unconfirmed');

            statusText.setText(
                localBackupSaved || surveyBackupSent
                    ? 'The game could not confirm that Google stored your responses. A backup has been preserved.'
                    : 'The game could not confirm or preserve your responses. Please notify the researcher before closing this tab.'
            );

            this.addFinalCloseControls();
        });
}

      addFinalCloseControls ()
    {
        this.addButton(
            640,
            485,
            260,
            58,
            'Close game',
            () => {
                window.close();
            }
        );

        this.addScreenText(
            640,
            555,
            'If this tab does not close automatically, close it manually to return to the survey.',
            18,
            COLORS.muted,
            800,
            'center'
        ).setOrigin(0.5);
    } // This brace is required

    async saveGameData ()
    {
        console.log(
            'NATIONAL GAME DATA:',
            this.gameData
        );

    if (
        !this.isValidExternalId(
            this.gameData.gameId
        ) ||
        !this.isValidExternalId(
            this.gameData.qualtricsId
        )
    )
    {
        throw new Error(
            'The game ID or Qualtrics response ID is invalid.'
        );
    }

    if (!this.saveEndpoint)
    {
        throw new Error(
            'No save endpoint is configured.'
        );
    }

    this.gameData.saveStatus =
        'awaiting_confirmation';

    this.persistLocalBackup();

    this.sendSurveyBackup(
        'awaiting_confirmation'
    );

    const response = await fetch(
        this.saveEndpoint,
        {
            method: 'POST',
            mode: 'cors',
            credentials: 'omit',
            cache: 'no-store',
            redirect: 'follow',
            headers: {
                'Content-Type':
                    'text/plain;charset=utf-8'
            },
            body: JSON.stringify(
                this.gameData
            )
        }
    );

    if (!response.ok)
    {
        throw new Error(
            `The save server returned HTTP ${response.status}.`
        );
    }

    let acknowledgement;

    try
    {
        acknowledgement =
            await response.json();
    }
    catch (error)
    {
        throw new Error(
            'The save server did not return a valid JSON confirmation.'
        );
    }

    const acknowledgementMatches =
        acknowledgement &&
        acknowledgement.ok === true &&
        String(acknowledgement.gameId) ===
            String(this.gameData.gameId) &&
        String(acknowledgement.qualtricsId) ===
            String(this.gameData.qualtricsId);

    if (!acknowledgementMatches)
    {
        throw new Error(
            'The save server did not confirm the matching game and Qualtrics IDs.'
        );
    }

    this.gameData.saveAcknowledged = true;
    this.gameData.saveStatus = 'confirmed';

    this.clearLocalBackup();

    return acknowledgement;
}

getLocalBackupKey ()
{
    return (
        'americanEconomyTaskBackup:' +
        this.gameData.gameId
    );
}

persistLocalBackup ()
{
    const backupKey =
        this.getLocalBackupKey();

    try
    {
        localStorage.setItem(
            backupKey,
            JSON.stringify(this.gameData)
        );

        this.gameData.localBackupKey =
            backupKey;

        return true;
    }
    catch (error)
    {
        this.gameData.localBackupKey =
            null;

        return false;
    }
}

clearLocalBackup ()
{
    try
    {
        localStorage.removeItem(
            this.getLocalBackupKey()
        );

        this.gameData.localBackupKey =
            null;
    }
    catch (error)
    {
        /*
         * The confirmed server copy remains
         * the authoritative record.
         */
    }
}

buildSurveyBackupSummary ()
{
    return {
        gameId:
            this.gameData.gameId,

        qualtricsId:
            this.gameData.qualtricsId,

        condition:
            this.gameData.condition,

        respondentDecile:
            this.gameData.respondentDecile,

        comprehensionCheckChoice:
            this.gameData
                .comprehensionCheckChoice,

        comprehensionCheckPassed:
            this.gameData
                .comprehensionCheckPassed,

        manipulationCheckChoice:
            this.gameData
                .manipulationCheckChoice,

        manipulationCheckPassed:
            this.gameData
                .manipulationCheckPassed,

        freeAllocationFinal:
            this.gameData
                .freeAllocationFinal,

        equalDivisionOutcomeChoice:
            this.gameData
                .equalDivisionOutcomeChoice,

        partialRedistributionFinal:
            this.gameData
                .partialRedistributionFinal,

        redistributionChoices:
            this.gameData
                .redistributionChoices,

        economicPrinciples:
            this.gameData
                .economicPrinciples,

        selfInterestCondition:
            this.gameData
                .selfInterestCondition,

        respondentDecileRevealed:
            this.gameData
                .respondentDecileRevealed,

        selfInterestAllocationFinal:
            this.gameData
                .selfInterestAllocationFinal,

        selfInterestOwnChange:
            this.gameData
                .selfInterestOwnChange,

        selfInterestEqualButtonUsed:
            this.gameData
                .selfInterestEqualButtonUsed,

        selfInterestPartialButtonUsed:
            this.gameData
                .selfInterestPartialButtonUsed,

        gameEndTime:
            this.gameData.gameEndTime,

        totalDurationMs:
            this.gameData.totalDurationMs
    };
}

sendSurveyBackup (saveStatus)
{
    const message = {
        type:
            'national-resource-game-complete',

        saveStatus,

        gameId:
            this.gameData.gameId,

        qualtricsId:
            this.gameData.qualtricsId,

        condition:
            this.conditionName,

        summary:
            this.buildSurveyBackupSummary(),

        payload:
            this.gameData
    };

    const targetOrigin =
        this.parentOrigin || '*';

    const targets = [];

    if (
        window.opener &&
        !window.opener.closed
    )
    {
        targets.push(
            window.opener
        );
    }

    if (
        window.parent &&
        window.parent !== window
    )
    {
        targets.push(
            window.parent
        );
    }

    const uniqueTargets = [
        ...new Set(targets)
    ];

    uniqueTargets.forEach(target => {
        target.postMessage(
            message,
            targetOrigin
        );
    });

    this.gameData.parentBackupSent =
        uniqueTargets.length > 0;

    return this.gameData.parentBackupSent;
}

recordAction (action)
{
    this.gameData.actions.push({
        ...action,

        elapsedMs: Math.round(
            performance.now() -
            this.sessionStartPerformance
        ),

        timestamp:
            new Date().toISOString()
    });
}

recordAnswer (question, answer)
{
    this.recordAction({
        action: 'answer',
        question,
        answer
    });
}

enterScreen (screenName)
{
    this.finishCurrentScreen();

    this.currentScreenName =
        screenName;

    this.currentScreenStartedAt =
        performance.now();
}

finishCurrentScreen ()
{
    if (
        this.currentScreenName === null ||
        this.currentScreenStartedAt === null ||
        !this.gameData
    )
    {
        return;
    }

    const elapsed = Math.round(
        performance.now() -
        this.currentScreenStartedAt
    );

    const prior =
        this.gameData.screenTimings[
            this.currentScreenName
        ] || 0;

    this.gameData.screenTimings[
        this.currentScreenName
    ] = prior + elapsed;

    this.currentScreenStartedAt = null;
}

addPanel (
    centerX,
    centerY,
    width,
    height
)
{
    const panel = this.add.rectangle(
        centerX,
        centerY,
        width,
        height,
        COLORS.panel
    );

    panel.setStrokeStyle(
        2,
        COLORS.border
    );

    this.addScreenObject(panel);

    return panel;
}

addScreenText (
    x,
    y,
    text,
    fontSize,
    color,
    wrapWidth,
    align = 'left'
)
{
    const object = this.add.text(
        x,
        y,
        text,
        {
            fontFamily:
                'Arial, sans-serif',

            fontSize:
                `${fontSize}px`,

            color,
            align,
            lineSpacing: 6,

            wordWrap: {
                width: wrapWidth
            }
        }
    );

    this.addScreenObject(object);

    return object;
}

addButton (
    centerX,
    centerY,
    width,
    height,
    label,
    callback,
    fillColor = COLORS.button,
    textColor = COLORS.buttonText
)
{
    const button = this.add.rectangle(
        centerX,
        centerY,
        width,
        height,
        fillColor
    );

    button.setStrokeStyle(
        2,
        COLORS.border
    );

    button.setInteractive({
        useHandCursor: true
    });

    button.setDepth(100);

    this.addScreenObject(button);

    const labelText =
        this.addScreenText(
            centerX,
            centerY,
            label,
            21,
            textColor,
            width - 22,
            'center'
        ).setOrigin(0.5);

    labelText.setDepth(101);

    button.on(
        'pointerdown',
        callback
    );

    return button;
}

addScreenObject (object)
{
    this.screenObjects.push(object);

    return object;
}

clearScreen ()
{
    this.screenObjects.forEach(object => {
        if (
            object &&
            object.destroy &&
            object.active !== false
        )
        {
            object.destroy();
        }
    });

    this.screenObjects = [];
}
}