import { seededRandom } from "../../../lib/random";
import type { Cell, Difficulty, PuzzleDef } from "./types";
import { MAX_ROWS, MAX_COLS } from "./types";

/**
 * 365 author-day sets. Each day features one author with three quotes
 * at increasing difficulty. Format:
 * [author, easyTitle, easyText, medTitle, medText, hardTitle, hardText]
 */
type AuthorSet = [string, string, string, string, string, string, string];

export function bestGrid(n: number): [number, number] {
  let best: [number, number] = [3, 3];
  let bestDiff = Infinity;
  for (let r = 3; r <= MAX_ROWS; r++) {
    if (n % r !== 0) continue;
    const c = n / r;
    if (c < 3 || c > MAX_COLS) continue;
    const diff = Math.abs(r - c);
    if (diff < bestDiff) { bestDiff = diff; best = [r, c]; }
  }
  return best;
}

function hamiltonianPath(
  rows: number,
  cols: number,
  rand: () => number,
): Cell[] {
  const total = rows * cols;

  function getNeighbors(row: number, col: number): Cell[] {
    const out: Cell[] = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const r2 = row + dr;
        const c2 = col + dc;
        if (r2 >= 0 && r2 < rows && c2 >= 0 && c2 < cols) {
          out.push({ row: r2, col: c2 });
        }
      }
    }
    return out;
  }

  function attempt(): Cell[] | null {
    const visited = Array.from({ length: rows }, () =>
      new Array<boolean>(cols).fill(false),
    );

    const sr = Math.floor(rand() * rows);
    const sc = Math.floor(rand() * cols);
    visited[sr][sc] = true;
    const path: Cell[] = [{ row: sr, col: sc }];

    while (path.length < total) {
      const tail = path[path.length - 1];
      const nexts = getNeighbors(tail.row, tail.col).filter(
        (n) => !visited[n.row][n.col],
      );
      if (nexts.length === 0) return null;

      // Warnsdorff: prefer neighbors with fewest onward moves
      let bestScore = Infinity;
      const scored: { cell: Cell; score: number }[] = [];
      for (const n of nexts) {
        let free = 0;
        for (const nn of getNeighbors(n.row, n.col)) {
          if (!visited[nn.row][nn.col]) free++;
        }
        scored.push({ cell: n, score: free });
        if (free < bestScore) bestScore = free;
      }

      // Collect all candidates tied for best score, pick randomly
      const best = scored.filter((s) => s.score === bestScore);
      const pick = best[Math.floor(rand() * best.length)].cell;
      visited[pick.row][pick.col] = true;
      path.push(pick);
    }
    return path;
  }

  // Greedy Warnsdorff with random restarts
  for (let i = 0; i < 100; i++) {
    const result = attempt();
    if (result) return result;
  }

  // Fallback: boustrophedon (guaranteed valid)
  const fallback: Cell[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      fallback.push({ row: r, col: r % 2 === 0 ? c : cols - 1 - c });
    }
  }
  return fallback;
}

function expand(
  title: string,
  text: string,
  id: string,
  difficulty: Difficulty,
  rand: () => number,
): PuzzleDef {
  const letters = text.replace(/[^A-Z]/g, "");
  const [rows, cols] = bestGrid(letters.length);
  const path = hamiltonianPath(rows, cols, rand);
  const grid: string[][] = Array.from({ length: rows }, () =>
    new Array<string>(cols),
  );
  for (let i = 0; i < path.length; i++) {
    grid[path[i].row][path[i].col] = letters[i];
  }
  return { id, title, difficulty, rows, cols, grid, text, path };
}

const AUTHORS: AuthorSet[] = [
  ["Aesop", "Union", "UNION IS STRENGTH", "Steady Wins", "SLOW AND STEADY WINS THE RACE", "Little Friends", "LITTLE FRIENDS MAY PROVE GREAT FRIENDS IN THE TIME OF NEED"],
  ["Abraham Lincoln", "This Too", "THIS TOO SHALL PASS", "Good Person", "WHATEVER YOU ARE BE A GOOD ONE", "Years", "IN THE END IT IS NOT THE YEARS IN YOUR LIFE THAT COUNT IT IS THE LIFE IN YOUR YEARS"],
  ["Albert Einstein", "Time", "TIME IS AN ILLUSION", "Learn", "ONCE YOU STOP LEARNING YOU START DYING", "Curiosity", "I HAVE NO SPECIAL TALENT I AM PASSIONATELY CURIOUS"],
  ["Aristotle", "Patience", "PATIENCE IS BITTER", "Activity", "HAPPINESS IS A STATE OF ACTIVITY", "Fear", "FEAR IS PAIN ARISING FROM THE ANTICIPATION OF EVIL"],
  ["Benjamin Franklin", "Haste", "HASTE MAKES WASTE", "Pennies", "A PENNY SAVED IS A PENNY EARNED", "Investment", "AN INVESTMENT IN KNOWLEDGE PAYS THE BEST INTEREST"],
  ["Buddha", "Conquer", "CONQUER YOURSELF", "Health", "HEALTH IS THE GREATEST WEALTH", "Peace", "TRUE PEACE COMES FROM WITHIN DO NOT SEEK IT WITHOUT"],
  ["Confucius", "Practice", "LEARN AND PRACTICE", "Asks", "THE MAN WHO ASKS IS A FOOL FOR A MINUTE", "Knowledge", "REAL KNOWLEDGE IS TO KNOW THE EXTENT OF YOUR IGNORANCE"],
  ["Charles Dickens", "Barkis", "BARKIS IS WILLING", "Tears", "WE NEED NEVER BE ASHAMED OF OUR TEARS", "Times", "IT WAS THE BEST OF TIMES AND IT WAS THE WORST OF TIMES"],
  ["Emily Dickinson", "Dwell", "DWELL IN POSSIBILITY", "Beauty", "BEAUTY IS NOT CAUSED IT IS", "Vain", "IF I CAN STOP ONE HEART FROM BREAKING I SHALL NOT LIVE IN VAIN"],
  ["Friedrich Nietzsche", "God", "GOD IS DEAD", "Stronger", "WHAT DOES NOT KILL US MAKES US STRONGER", "Abyss", "IF YOU GAZE LONG INTO AN ABYSS THE ABYSS ALSO GAZES INTO YOU"],
  ["Galileo Galilei", "Moves", "YET IT STILL MOVES", "Doubt", "DOUBT IS THE FATHER OF INVENTION", "Math", "MATH IS THE LANGUAGE IN WHICH GOD HAS WRITTEN THE UNIVERSE"],
  ["Helen Keller", "Optimism", "OPTIMISM IS THE FAITH", "Door", "WHEN ONE DOOR OF HAPPINESS CLOSES ANOTHER OPENS", "Adventure", "LIFE IS EITHER A DARING ADVENTURE OR NOTHING AT ALL"],
  ["Henry David Thoreau", "Simplify", "SIMPLIFY SIMPLIFY", "Detail", "LIFE IS FRITTERED AWAY BY DETAIL SIMPLIFY", "Truth", "RATHER THAN LOVE THAN MONEY THAN FAME GIVE ME TRUTH"],
  ["Jane Austen", "Fools", "WE ARE FOOLS IN LOVE", "Angry", "ANGRY PEOPLE ARE NOT ALWAYS WISE", "Reading", "I DECLARE AFTER ALL THERE IS NO ENJOYMENT LIKE READING"],
  ["John F Kennedy", "Berliner", "I AM A BERLINER", "Tide", "A RISING TIDE LIFTS ALL BOATS", "Moon", "WE GO TO THE MOON NOT BECAUSE IT IS EASY BUT BECAUSE IT IS HARD"],
  ["Lao Tzu", "Contentment", "BE CONTENT", "Wisdom of Others", "KNOWING OTHERS IS WISDOM", "Patience of Nature", "NATURE DOES NOT HURRY YET EVERYTHING IS ACCOMPLISHED"],
  ["Leonardo da Vinci", "Art Is Long", "ART IS LONG", "Perfection", "DETAILS MAKE PERFECTION", "Spirit and Hand", "WHERE THE SPIRIT DOES NOT WORK WITH THE HAND THERE IS NO ART"],
  ["Mahatma Gandhi", "Truth Wins", "TRUTH WINS OUT", "Live Today", "LIVE AS IF YOU WERE TO DIE TOMORROW", "Inner Strength", "STRENGTH DOES NOT COME FROM PHYSICAL CAPACITY IT COMES FROM WILL"],
  ["Marcus Aurelius", "No More Time", "WASTE NO MORE TIME", "Memento Mori", "THINK OF YOURSELF AS DEAD", "Dyed Soul", "YOUR SOUL BECOMES DYED WITH THE COLOR OF YOUR THOUGHTS"],
  ["Mark Twain", "Humor", "HUMOR IS GREAT", "Action Speaks", "ACTION SPEAKS LOUDER THAN WORDS", "Your Ambitions", "KEEP AWAY FROM PEOPLE WHO BELITTLE YOUR AMBITIONS"],
  ["Martin Luther King Jr", "First Step", "TAKE THE FIRST STEP", "Faith", "FAITH IS TAKING THE FIRST STEP", "Light Over Dark", "DARKNESS CANNOT DRIVE OUT DARKNESS ONLY LIGHT CAN DO THAT"],
  ["Maya Angelou", "Be a Rainbow", "TRY TO BE A RAINBOW", "Courage", "COURAGE IS THE MOST IMPORTANT OF ALL THE VIRTUES", "Never Defeated", "WE MAY ENCOUNTER MANY DEFEATS BUT WE MUST NEVER BE DEFEATED"],
  ["Napoleon Bonaparte", "Deliberate", "TAKE TIME TO DELIBERATE", "Imagination", "IMAGINATION RULES THE WORLD", "Courage and Hope", "COURAGE IS LIKE LOVE IT MUST HAVE HOPE FOR NOURISHMENT"],
  ["Nelson Mandela", "Lead from Back", "LEAD FROM THE BACK", "Win or Learn", "I NEVER LOSE I EITHER WIN OR LEARN", "Power of Education", "EDUCATION IS THE MOST POWERFUL WEAPON TO CHANGE THE WORLD"],
  ["Oscar Wilde", "Know Yourself", "KNOW YOURSELF", "Rarest Thing", "TO LIVE IS THE RAREST THING IN THE WORLD", "Saints and Sinners", "EVERY SAINT HAS A PAST AND EVERY SINNER HAS A FUTURE"],
  ["Plato", "Love Is All", "LOVE ALL TRULY", "Music and Soul", "MUSIC GIVES A SOUL TO THE UNIVERSE", "Education Starts", "THE DIRECTION IN WHICH EDUCATION STARTS A MAN WILL DETERMINE HIS FUTURE LIFE"],
  ["Ralph Waldo Emerson", "Walls and Doors", "EVERY WALL IS A DOOR", "Experiment", "ALL LIFE IS AN EXPERIMENT", "Anger", "FOR EACH MINUTE YOU ARE ANGRY YOU LOSE SIXTY SECONDS OF HAPPINESS"],
  ["Rumi", "Love Bridge", "LOVE IS THE BRIDGE", "Seeking You", "WHAT YOU TRULY SEEK IS SEEKING YOU", "Fan Your Flames", "SET YOUR LIFE ON FIRE SEEK THOSE WHO FAN YOUR FLAMES"],
  ["Socrates", "Seek the Truth", "SEEK THE TRUTH", "Know Nothing", "I KNOW THAT I KNOW NOTHING", "Knowledge Over Wealth", "PREFER KNOWLEDGE TO WEALTH FOR THE ONE IS PASSING THE OTHER ETERNAL"],
  ["Sun Tzu", "In War Prepare", "IN WAR PREPARE", "Know Your Enemy", "KNOW THE ENEMY AND KNOW YOURSELF", "Greatest Victory", "THE GREATEST VICTORY IS THAT WHICH REQUIRES NO BATTLE"],
  ["Theodore Roosevelt", "Man in Arena", "DO WHAT YOU CAN", "Dare Mighty Things", "FAR BETTER TO DARE MIGHTY THINGS", "Hard to Fail", "IT IS HARD TO FAIL BUT IT IS WORSE NEVER TO HAVE TRIED"],
  ["Thomas Edison", "Have Faith", "HAVE FAITH", "Start Where Others Quit", "I START WHERE OTHERS QUIT", "Satisfied Man", "SHOW ME A SATISFIED MAN AND I WILL SHOW YOU A FAILURE"],
  ["Thomas Jefferson", "Act Well", "ACT WELL YOUR PART", "Best Exercise", "WALKING IS THE BEST EXERCISE", "Learn Daily", "EVERY DAY IS LOST IN WHICH WE DO NOT LEARN SOMETHING USEFUL"],
  ["Victor Hugo", "Dare to Act", "DARE TO ACT", "Future Names", "THE FUTURE HAS MANY NAMES", "Greatest Happiness", "THE GREATEST HAPPINESS IN LIFE IS TO KNOW THAT WE ARE LOVED"],
  ["Voltaire", "Love Truth", "LOVE TRUTH", "Common Sense", "COMMON SENSE IS NOT SO COMMON", "Cards Dealt", "EACH PLAYER MUST ACCEPT THE CARDS LIFE DEALS HIM OR HER"],
  ["Walt Disney", "Good Idea", "GET A GOOD IDEA", "Keep Moving", "JUST KEEP MOVING FORWARD", "Believe All Way", "WHEN YOU BELIEVE IN A THING BELIEVE IN IT ALL THE WAY"],
  ["William Shakespeare", "All Is Well", "ALL IS WELL", "Soul of Wit", "BREVITY IS THE SOUL OF WIT", "Good or Bad", "THERE IS NOTHING EITHER GOOD OR BAD BUT THINKING MAKES IT SO"],
  ["Winston Churchill", "Finest Hour", "THEIR FINEST HOUR", "Never Give Up", "NEVER NEVER NEVER GIVE UP", "Big Difference", "ATTITUDE IS A LITTLE THING THAT MAKES A BIG DIFFERENCE"],
  ["Seneca", "Time Heals", "ONLY TIME CAN HEAL", "Wait for Life", "WHILE WE WAIT FOR LIFE LIFE PASSES", "Luck Preparation", "LUCK IS WHAT HAPPENS WHEN PREPARATION MEETS OPPORTUNITY"],
  ["Epictetus", "Control Mind", "CONTROL YOUR MIND", "Little Things", "PRACTICE YOURSELF IN LITTLE THINGS", "Thought Foolish", "IF YOU WANT TO IMPROVE BE CONTENT TO BE THOUGHT FOOLISH"],
  ["Marcus Tullius Cicero", "Own Reward", "VIRTUE IS ITS OWN REWARD", "Honor Virtue", "HONOR IS THE REWARD OF VIRTUE", "Study Philosophy", "TO STUDY PHILOSOPHY IS NOTHING BUT TO PREPARE ONESELF TO DIE"],
  ["Fyodor Dostoevsky", "Calm Mind", "A CALM MIND", "Suffering Life", "SUFFERING IS PART OF LIFE", "Something New", "THERE IS NO SUBJECT SO OLD THAT SOMETHING NEW CANNOT BE SAID ABOUT IT"],
  ["Leo Tolstoy", "Choose Love", "CHOOSE TO LOVE", "Force of Life", "FAITH IS THE FORCE OF LIFE", "Changing World", "EVERYONE THINKS OF CHANGING THE WORLD BUT NO ONE THINKS OF CHANGING HIMSELF"],
  ["Alexander Hamilton", "Rise Above", "RISE ABOVE", "Think Continentally", "LEARN TO THINK CONTINENTALLY", "Real Firmness", "REAL FIRMNESS IS GOOD FOR ANYTHING STRUT IS GOOD FOR NOTHING"],
  ["George Washington", "Guard Liberty", "GUARD LIBERTY", "Soul of Army", "DISCIPLINE IS THE SOUL OF AN ARMY", "Spirit Wonders", "PERSEVERANCE AND SPIRIT HAVE DONE WONDERS IN ALL AGES"],
  ["John Adams", "Stubborn Facts", "FACTS ARE STUBBORN", "Government of Laws", "THE GOVERNMENT OF LAWS NOT OF MEN", "Study and War", "I MUST STUDY POLITICS AND WAR THAT MY SONS MAY STUDY ART"],
  ["James Madison", "Liberty and Order", "LIBERTY AND ORDER", "Ambition Checks", "AMBITION MUST CHECK AMBITION", "Power Mistrusted", "THE TRUTH IS THAT ALL MEN HAVING POWER OUGHT TO BE MISTRUSTED"],
  ["Patrick Henry", "No Retreat", "I KNOW OF NO RETREAT", "Strong Alone", "THE BATTLE IS NOT TO THE STRONG ALONE", "Judging the Future", "I KNOW OF NO WAY OF JUDGING THE FUTURE BUT BY THE PAST"],
  ["Samuel Johnson", "Idle Curiosity", "CURIOSITY IS IDLE", "Two Kinds", "KNOWLEDGE IS OF TWO KINDS", "Great Works", "GREAT WORKS ARE PERFORMED NOT BY STRENGTH BUT PERSEVERANCE"],
  ["Jonathan Swift", "Like Cobwebs", "LAWS ARE LIKE COBWEBS", "Days of Life", "MAY YOU LIVE ALL THE DAYS OF YOUR LIFE", "Satire Glass", "SATIRE IS A SORT OF GLASS WHEREIN BEHOLDERS DISCOVER FACES"],
  ["Alexander Pope", "To Err", "TO ERR IS HUMAN", "Dangerous Learning", "A LITTLE LEARNING IS A DANGEROUS THING", "Revenge", "TO BE ANGRY IS TO REVENGE THE FAULTS OF OTHERS ON OURSELVES"],
  ["John Milton", "Own Place", "THE MIND IS ITS OWN PLACE", "Stand and Wait", "THEY ALSO SERVE WHO STAND AND WAIT", "Liberty to Know", "GIVE ME THE LIBERTY TO KNOW TO UTTER AND TO ARGUE FREELY"],
  ["John Keats", "Tender Night", "TENDER IS THE NIGHT", "Sweet Melodies", "HEARD MELODIES ARE SWEET", "Holiness of Heart", "I AM CERTAIN OF NOTHING BUT OF THE HOLINESS OF THE HEART"],
  ["Percy Shelley", "Fear Not", "FEAR NOT THE FUTURE", "Lovers Lips", "SOUL MEETS SOUL ON LOVERS LIPS", "Moral Imagination", "THE GREAT INSTRUMENT OF MORAL GOOD IS THE IMAGINATION"],
  ["Lord Byron", "Walks in Beauty", "SHE WALKS IN BEAUTY", "Sensation", "THE GREAT ART OF LIFE IS SENSATION", "Art of Life", "THE GREAT ART OF LIFE IS SENSATION TO FEEL THAT WE EXIST"],
  ["William Wordsworth", "Nature Betrays", "NATURE NEVER DID BETRAY", "Child Is Father", "THE CHILD IS FATHER OF THE MAN", "Breathings of Heart", "FILL YOUR PAPER WITH THE DEEP BREATHINGS OF YOUR HEART"],
  ["Robert Burns", "Best Laid Plans", "THE BEST LAID PLANS", "Brothers All", "MAN TO MAN THE WORLD OVER SHALL BROTHERS BE", "Stubborn Statistics", "FACTS ARE STUBBORN THINGS BUT STATISTICS ARE MORE PLIABLE"],
  ["Robert Frost", "Nothing Gold", "NOTHING GOLD CAN STAY", "Miles to Go", "MILES TO GO BEFORE I SLEEP", "It Goes On", "IN THREE WORDS I CAN SUM UP EVERYTHING ABOUT LIFE IT GOES ON"],
  ["Walt Whitman", "Multitudes", "I CONTAIN MULTITUDES", "Toward Sunshine", "KEEP YOUR FACE ALWAYS TOWARD THE SUNSHINE", "Contradict Myself", "DO I CONTRADICT MYSELF VERY WELL THEN I CONTRADICT MYSELF"],
  ["Emily Bronte", "No Coward Soul", "NO COWARD SOUL IS MINE", "More Myself", "HE IS MORE MYSELF THAN I AM", "Souls the Same", "WHATEVER OUR SOULS ARE MADE OF HIS AND MINE ARE THE SAME"],
  ["Charlotte Bronte", "Identity", "I AM NO BIRD", "Freedom", "I AM NO BIRD AND NO NET ENSNARES ME", "Prejudice", "PREJUDICES THEY SAY ARE MOST DIFFICULT TO ERADICATE FROM THE HEART"],
  ["Louisa May Alcott", "Reading", "LOVE YOUR NEIGHBOR", "Love", "LOVE IS THE GREAT BEAUTIFIER", "Aspirations", "FAR AWAY THERE IN THE SUNSHINE ARE MY HIGHEST ASPIRATIONS"],
  ["Harriet Tubman", "Railroad", "I WAS THE CONDUCTOR", "Liberty", "I HAD CROSSED THAT LINE I WAS FREE", "Courage", "I FREED A THOUSAND SLAVES AND COULD HAVE FREED MORE"],
  ["Frederick Douglass", "Truth", "I PREFER TO BE TRUE", "Soul", "THE SOUL THAT IS WITHIN ME", "Children", "IT IS EASIER TO BUILD STRONG CHILDREN THAN REPAIR BROKEN MEN"],
  ["Sojourner Truth", "Identity", "I AM A WOMAN", "Strength", "I CAN DO AS MUCH WORK AS ANY MAN", "Equality", "IF MY CUP WONT HOLD BUT A PINT AND YOURS HOLDS A QUART"],
  ["Susan B Anthony", "Union", "JOIN THE UNION", "Freedom", "INDEPENDENCE AND HAPPINESS", "Trust", "I DISTRUST THOSE PEOPLE WHO KNOW SO WELL WHAT GOD WANTS"],
  ["Elizabeth Cady Stanton", "Writing", "PUT IT DOWN IN WRITING", "Truth", "TRUTH IS THE ONLY SAFE GROUND", "Sacrifice", "SELF DEVELOPMENT IS A HIGHER DUTY THAN SELF SACRIFICE"],
  ["Booker T Washington", "Power", "CHARACTER IS POWER", "Focus", "LET US KEEP BEFORE US THE FACT", "Lifting", "IF YOU WANT TO LIFT YOURSELF UP LIFT UP SOMEONE ELSE"],
  ["W E B Du Bois", "Self", "EDUCATE YOURSELF", "Ideas", "DEVELOP THE BEST THAT IS IN US", "Progress", "BELIEVE IN LIFE ALWAYS HUMAN BEINGS WILL PROGRESS"],
  ["Langston Hughes", "America", "I TOO SING AMERICA", "Freedom", "LET AMERICA BE AMERICA AGAIN", "Rivers", "I HAVE KNOWN RIVERS ANCIENT AS THE WORLD AND OLDER THAN THE FLOW OF HUMAN BLOOD"],
  ["Zora Neale Hurston", "Ambition", "JUMP AT THE SUN", "Having", "THOSE THAT DONT GOT IT CANT SHOW IT", "Stories", "THERE IS NO AGONY LIKE BEARING AN UNTOLD STORY INSIDE OF YOU"],
  ["James Baldwin", "Time", "THE FIRE NEXT TIME", "Origin", "KNOW FROM WHENCE YOU CAME", "Freedom", "FREEDOM IS NOT SOMETHING THAT ANYBODY CAN BE GIVEN"],
  ["Toni Morrison", "Freedom", "FREEING YOURSELF", "Free", "FREE YOURSELF FREE YOURSELF", "Books", "WRITE THE BOOK YOU WANT TO READ THAT HAS NOT YET BEEN WRITTEN"],
  ["Alice Walker", "Awareness", "KEEP IN MIND ALWAYS", "Surprise", "EXPECT NOTHING LIVE FRUGALLY ON SURPRISE", "Activism", "ACTIVISM IS THE RENT I PAY FOR LIVING ON THIS PLANET"],
  ["Nikki Giovanni", "Poetry", "POETRY IS LIFE", "Self", "DEAL WITH YOURSELF AS AN INDIVIDUAL", "Style", "STYLE HAS A PURPOSE AND THAT PURPOSE IS TO DEFY TIME"],
  ["Gwendolyn Brooks", "Cool", "WE ARE COOL", "Poetry", "POETRY IS LIFE DISTILLED", "Blooming", "CONDUCT YOUR BLOOMING IN THE NOISE AND WHIP OF THE WHIRLWIND"],
  ["Audre Lorde", "Power Word", "USE YOUR POWER", "Silence", "YOUR SILENCE WILL NOT PROTECT YOU", "Tools", "THE MASTERS TOOLS WILL NEVER DISMANTLE THE MASTERS HOUSE"],
  ["bell hooks", "About Love", "ALL ABOUT LOVE", "Political", "LOVE IS PROFOUNDLY POLITICAL", "Thinking", "TO BEGIN BY ALWAYS THINKING OF LOVE AS AN ACTION NOW"],
  ["Cornel West", "Love Action", "LOVE IN ACTION", "Courage", "COURAGE IS AN ENABLING VIRTUE", "People", "YOU CANT LEAD THE PEOPLE IF YOU DONT LOVE THE PEOPLE"],
  ["Angela Davis", "Act", "WE MUST ACT", "Serious", "REVOLUTION IS A SERIOUS THING", "Accepting", "I AM NO LONGER ACCEPTING THE THINGS I CANNOT CHANGE"],
  ["Rosa Parks", "No Fear", "I DID NOT FEEL FEAR", "Tired", "I WAS SO TIRED OF GIVING IN", "Model", "EVERY PERSON MUST LIVE THEIR LIFE AS A MODEL FOR OTHERS"],
  ["Shirley Chisholm", "Fight", "I MEAN TO FIGHT HARD", "Catalyst", "I AM A CATALYST FOR CHANGE", "Sideline", "YOU DONT MAKE PROGRESS BY STANDING ON THE SIDELINE"],
  ["Barbara Jordan", "Act Now", "WE MUST ACT NOW", "Faith", "I HAVE FAITH IN THE CONSTITUTION", "Difference", "I BELIEVE THAT EACH OF US CAN MAKE A REAL DIFFERENCE"],
  ["Fannie Lou Hamer", "Rise", "RISE UP NOW", "Plantation", "THEY KICKED ME OFF THE PLANTATION", "Movement", "THERE IS ONE THING YOU HAVE GOT TO LEARN ABOUT OUR MOVEMENT"],
  ["Ida B Wells", "Truth", "TELL THE TRUTH", "Pen", "THE PEN IS THE WEAPON OF THE BRAVE", "Fighting", "ONE HAD BETTER DIE FIGHTING AGAINST ALL INJUSTICE"],
  ["Mary McLeod Bethune", "Hope Faith", "FAITH AND HOPE", "Love Hope", "I LEAVE YOU MY LOVE I LEAVE YOU HOPE", "Read", "THE WHOLE WIDE WORLD OPENED TO ME WHEN I LEARNED TO READ"],
  ["Dorothy Height", "Work", "WORK TOGETHER", "Tried", "I WANT TO BE REMEMBERED AS ONE WHO TRIED", "Each Other", "WE MUST TURN TO EACH OTHER AND NOT TURN ON EACH OTHER"],
  ["Marian Anderson", "Voice", "GRACE AND SONG", "Prayer", "PRAYER BEGINS WHERE ABILITY ENDS", "Ready", "THERE ARE MANY PERSONS WHO ARE READY TO DO WHAT IS RIGHT"],
  ["Ella Fitzgerald", "Feel", "I SING JUST LIKE I FEEL", "Happy", "EVERYONE WANTS TO KNOW IF I AM HAPPY AND I AM", "Singing", "THE ONLY THING BETTER THAN SINGING IS MORE SINGING"],
  ["Billie Holiday", "Love Singing", "I LOVE SINGING", "Hurt", "I NEVER HURT NOBODY BUT MYSELF", "Married", "MOM AND POP WERE JUST TWO KIDS WHEN THEY GOT MARRIED"],
  ["Nina Simone", "Freedom", "FREEDOM IS FEELING", "New Dawn", "IT IS A NEW DAWN AND IT IS A NEW LIFE", "No Fear", "I TELL YOU WHAT FREEDOM REALLY MEANS TO ME NO FEAR AT ALL"],
  ["Mike Tyson", "Battle Cry", "FIGHT HARD", "Greatest Fighter", "I AM THE GREATEST FIGHTER", "The Plan", "EVERYONE HAS A PLAN UNTIL THEY GET PUNCHED IN THE MOUTH"],
  ["George Foreman", "Power", "POWER WINS", "Fighter Pain", "I AM A FIGHTER AND FIGHTERS KNOW PAIN", "Get Back Up", "WHEN YOU GET KNOCKED DOWN JUST GET BACK UP AGAIN NOW"],
  ["Lennox Lewis", "Box to Win", "I BOX TO WIN", "Work Ethic", "HARD WORK AND DEDICATION WILL WIN", "Never Stop", "I HAVE FOUGHT ALL MY LIFE AND I WILL NEVER STOP FIGHTING UNTIL THE VERY END"],
  ["Floyd Mayweather", "Smart Work", "WORK SMART", "Best Fighter", "I AM THE BEST FIGHTER IN THE WORLD", "Lifetime Work", "I HAVE WORKED MY ENTIRE LIFE TO BE THE BEST AND I CAN PROVE IT"],
  ["Manny Pacquiao", "Faith", "GOD IS GOOD", "From Nothing", "I CAME FROM NOTHING AND I MADE MY NAME", "Believe in Yourself", "WHEN YOU BELIEVE IN YOURSELF NOTHING IS IMPOSSIBLE IN THIS WORLD"],
  ["Canelo Alvarez", "Fearless", "I FEAR NONE", "Ready for War", "WHEN I STEP IN THE RING I AM READY FOR WAR", "Legacy in Boxing", "I TRAIN EVERY SINGLE DAY BECAUSE I WANT TO LEAVE A LEGACY IN BOXING"],
  ["Oscar De La Hoya", "Fight Back", "FIGHT BACK", "Born to Box", "I WAS BORN TO BOX AND NOTHING CAN STOP ME", "Love the Sport", "BOXING GAVE ME EVERYTHING AND I WILL ALWAYS LOVE THIS SPORT WITH ALL MY HEART"],
  ["Roberto Duran", "Bring War", "I BRING WAR", "Heart of a Fighter", "WHEN I FIGHT I FIGHT WITH ALL MY HEART", "Street Champion", "I CAME FROM THE STREETS OF PANAMA AND BECAME A WORLD CHAMPION"],
  ["Marvelous Marvin Hagler", "Win or Lose", "WIN OR LOSE", "No Friends", "I DID NOT GO TO THE GYM TO MAKE FRIENDS", "Boxing Glove", "IF THEY CUT MY HEAD OPEN THEY WILL FIND ONE BIG BOXING GLOVE"],
  ["Thomas Hearns", "Fast Hands", "FAST HANDS", "Speed Kills", "SPEED KILLS IN THE BOXING RING", "Lights Out", "WHEN I THREW MY RIGHT HAND IT WAS LIGHTS OUT FOR THEM"],
  ["Laila Ali", "Inner Strength", "I AM STRONG", "Unstoppable Dream", "NOTHING CAN STOP ME FROM MY DREAM", "Self Belief", "YOU HAVE TO BELIEVE IN YOURSELF BEFORE ANYONE ELSE"],
  ["Tony Hawk", "Stay the Course", "RIDE IT OUT", "Life on Board", "MY WHOLE LIFE HAS BEEN ON THE BOARD", "Keep Trying", "YOU MIGHT NOT LAND IT THE FIRST TIME BUT KEEP TRYING"],
  ["Shaun White", "Love of Snow", "I LOVE SNOW", "Halfpipe Freedom", "THE HALFPIPE IS WHERE I FEEL FREE", "Be the First", "I WANTED TO DO SOMETHING NO ONE HAD EVER DONE BEFORE"],
  ["Kelly Slater", "Ride the Wave", "RIDE EACH WAVE", "Ocean Love", "MY LOVE FOR THE OCEAN WILL NEVER FADE", "Ocean Lessons", "THE OCEAN TEACHES YOU PATIENCE AND HUMILITY EVERY DAY"],
  ["Dale Earnhardt", "Race to Win", "RACE TO WIN", "Win and Lose", "YOU WIN SOME YOU LOSE SOME", "Never Gave Up", "IT TOOK ME A LONG TIME TO GET WHERE I AM BUT I NEVER GAVE UP"],
  ["Richard Petty", "Just Drive", "JUST DRIVE", "Love to Race", "I JUST LOVE TO RACE AND WIN", "Fan Driven", "THE FANS KEEP COMING BACK AND THAT IS WHAT DRIVES US"],
  ["Mario Andretti", "Drive Fast", "DRIVE FAST", "The Rush", "THERE IS NOTHING LIKE THE RUSH", "Out of Control", "IF YOU FEEL IN CONTROL YOU ARE NOT GOING FAST ENOUGH"],
  ["Danica Patrick", "Race Hard", "I RACE HARD", "Race to Win", "I RACE TO WIN NOT JUST TO SHOW UP", "Just a Driver", "I WANT PEOPLE TO SEE ME AS A DRIVER NOT A WOMAN DRIVER"],
  ["Ayrton Senna", "I Am Racing", "I AM RACING", "Overtake", "YOU CANNOT OVERTAKE IF YOU DO NOT TRY", "Speed of Life", "WITH A CAR YOU ARE GOING AT GREAT SPEED THROUGH LIFE"],
  ["Michael Schumacher", "Push to Win", "PUSH TO WIN", "Focus Wins", "FOCUS AND DRIVE WIN RACES", "Every Race", "I PUSHED HARD IN EVERY RACE BECAUSE THAT IS WHAT I DO"],
  ["Lewis Hamilton", "Living to Race", "I LIVE FOR THE RACE DAY", "Greatest Ambition", "I WANT TO BE THE GREATEST EVER", "Never Give Up", "THE MOST IMPORTANT THING IS TO NEVER GIVE UP ON YOUR DREAMS"],
  ["Muhammad Ali", "I Am Great", "I AM THE GREATEST EVER", "Float", "FLOAT LIKE A BUTTERFLY STING LIKE A BEE", "Risk2", "HE WHO IS NOT COURAGEOUS ENOUGH TO TAKE RISKS WILL ACCOMPLISH NOTHING IN LIFE"],
  ["Michael Jordan", "Win Game", "JUST WIN EVERY GAME", "Have Fun", "JUST PLAY HAVE FUN AND ENJOY THE GAME", "Failure", "I CAN ACCEPT FAILURE EVERYONE FAILS AT SOMETHING BUT I CANT ACCEPT NOT TRYING"],
  ["Yogi Berra", "What Is", "IT IS WHAT IT IS", "Over", "IT AINT OVER TILL ITS OVER", "Mental Half", "BASEBALL IS NINETY PERCENT MENTAL AND THE OTHER HALF IS PHYSICAL"],
  ["Satchel Paige", "Pitch On", "JUST KEEP PITCHING", "Look", "DONT LOOK BACK SOMETHING MIGHT BE GAINING ON YOU", "Run", "HOW OLD WOULD YOU BE IF YOU DIDNT KNOW HOW OLD YOU ARE"],
  ["Jackie Robinson", "Have Courage", "ABOVE ALL HAVE ALWAYS", "Above", "ABOVE ANYTHING ELSE I HATE TO LOSE", "Respect", "I AM NOT CONCERNED WITH YOUR LIKING OR DISLIKING ME ALL I ASK IS THAT YOU RESPECT ME AS A HUMAN BEING"],
  ["Wayne Gretzky", "Miss", "JUST TAKE THE SHOT", "Miss2", "YOU MISS EVERY SHOT YOU NEVER TAKE", "Grow", "THE HIGHEST COMPLIMENT THAT YOU CAN PAY ME IS TO SAY THAT I WORK HARD EVERY DAY"],
  ["John Wooden", "Peace Mind", "SUCCESS IS PEACE OF MIND", "Masterpiece", "MAKE EACH DAY YOUR THE FOREVER", "Reputation", "BE MORE CONCERNED WITH YOUR CHARACTER THAN YOUR REPUTATION"],
  ["Babe Ruth", "Play Win", "PLAY HARD AND WIN IT", "Hard", "IT IS HARD TO BEAT A PERSON WHO NEVER GIVES UP", "Fear Game", "NEVER LET THE FEAR OF STRIKING OUT KEEP YOU FROM PLAYING THE GAME I"],
  ["LeBron James", "Come Home", "I AM COMING THE", "Inspire", "I LIKE CRITICISM IT MAKES YOU STRONG", "Dream2", "DONT BE AFRAID OF FAILURE THIS IS THE WAY TO SUCCEED"],
  ["Pele", "Everything", "EVERYTHING IS PRACTICE", "Practice", "PRACTICE MAKES YOU GREAT", "Success2", "SUCCESS IS NO ACCIDENT IT IS HARD WORK PERSEVERANCE LEARNING AND SACRIFICE"],
  ["Serena Williams", "Very Best", "I AM THE VERY BEST I", "Luck2", "LUCK HAS NOTHING TO DO WITH IT", "Fight All", "I FIGHT FOR EVERY SINGLE POINT BECAUSE THAT IS WHO I AM I"],
  ["Tiger Woods", "Focus", "FOCUS ON THE SHOT AT HAND", "Focus", "THE ONLY SHOT THAT COUNTS", "Work4", "NO MATTER HOW GOOD YOU GET YOU CAN ALWAYS GET BETTER"],
  ["Tom Brady", "Win All", "JUST WIN IT ALL NOW", "Drive", "I JUST LOVE WINNING I LOVE COMPETING", "Day", "EVERY DAY IS AN OPPORTUNITY TO CREATE A LIVING MASTERPIECE"],
  ["Jack Nicklaus", "PLAY YOUR", "PLAY YOUR BEST GOLF", "Focus2", "FOCUS ON REMEDIES NOT FAULTS", "Effort", "I ALWAYS MAKE A TOTAL EFFORT EVEN WHEN THE ODDS ARE AGAINST ME"],
  ["Phil Jackson", "Zen Still", "BE ZEN AND BE STILL", "Step Win", "THE IDEAL WAY TO WIN A CHAMPIONSHIP IS STEP BY THE", "Always", "ALWAYS KEEP AN OPEN MIND AND A COMPASSIONATE HEART"],
  ["Pat Riley", "Win Every", "WIN EVERY SINGLE GAME", "Look2", "LOOK FOR THE GOOD IN EVERY SITUATION", "Excellence2", "EXCELLENCE IS THE GRADUAL RESULT OF ALWAYS STRIVING TO DO BETTER"],
  ["Magic Johnson", "Pass First", "I LOVE TO PASS FIRST", "No Losing", "THERE IS NO LOSING IN LIFE ONLY FOREVER", "Winner", "ALL KIDS NEED IS A LITTLE HELP A LITTLE HOPE AND SOMEBODY WHO BELIEVES IN THEM"],
  ["Larry Bird", "Example Win", "LEAD BY EXAMPLE AND IT", "Push2", "PUSH YOURSELF AGAIN AND AGAIN", "Push Inch", "PUSH YOURSELF AGAIN AND AGAIN AND DO NOT GIVE AN INCH UNTIL THE FINAL BUZZER SOUNDS IT"],
  ["Stephen Curry", "Can", "I CAN DO ALL THINGS", "SUCCESS IS", "SUCCESS IS NEVER AN ACCIDENT", "Best3", "BE THE BEST VERSION OF YOURSELF IN ANYTHING THAT YOU DO"],
  ["Bob Marley", "Love", "ONE LOVE ONE HEART", "Live2", "LOVE THE LIFE YOU LIVE LIVE THE LIFE YOU LOVE", "Love5", "ONE GOOD THING ABOUT MUSIC WHEN IT HITS YOU YOU FEEL NO PAIN"],
  ["John Lennon", "Love6", "ALL YOU NEED IS LOVE", "Dream4", "IMAGINE ALL THE PEOPLE LIVING LIFE IN PEACE", "Peace", "IMAGINE ALL THE PEOPLE SHARING ALL THE WORLD IN HARMONY AND PEACE"],
  ["Dolly Parton", "FIND OUT", "FIND OUT WHO YOU ARE", "Dream5", "FIND OUT WHO YOU ARE AND DO IT ON PURPOSE", "THE WAY", "THE WAY I SEE IT IF YOU WANT THE RAINBOW YOU GOTTA PUT UP WITH THE RAIN SOMETIMES"],
  ["Ray Charles", "MUSIC FROM", "MUSIC FROM MY SOUL", "Soul3", "MUSIC IS MY LIFE MUSIC IS ALL OF ME", "Love8", "LOVE IS A SPECIAL WORD AND I USE IT ONLY WHEN I MEAN IT"],
  ["Duke Ellington", "Swing", "LETS SWING TONIGHT", "Problem", "A PROBLEM IS A CHANCE FOR YOU TO DO YOUR BEST", "IT DONT", "IT DONT MEAN A THING IF IT AINT GOT THAT SWING BECAUSE IT JUST DONT MEAN NOTHING"],
  ["Louis Armstrong", "WHAT A", "WHAT A BEEN", "THERE IS", "THERE IS TWO KINDS OF GOOD", "Music6", "ALL MUSIC IS FOLK MUSIC I AINT NEVER HEARD A HORSE SING A SONG"],
  ["Prince", "MUSIC IS", "MUSIC IS REAL MAGIC", "Cool", "COOL MEANS BEING ABLE TO HANG WITH YOURSELF", "Music7", "DESPITE EVERYTHING NO ONE CAN DICTATE WHO YOU ARE TO OTHER PEOPLE"],
  ["David Bowie", "Mad", "ALL THE MADMEN", "Tomorrow2", "TOMORROW BELONGS TO THOSE WHO CAN HEAR IT COMING", "Effort3", "I ALWAYS HAD A REPULSIVE NEED TO BE SOMETHING MORE THAN HUMAN"],
  ["Freddie Mercury", "Rock", "I WILL ROCK YOU", "Star2", "I WONT BE A ROCK STAR I WILL BE A LEGEND", "Real", "THE REASON WE ARE SO GOOD IS BECAUSE WE ARE SUCH BAD MUSICIANS"],
  ["Elton John", "Music9", "MUSIC HAS HEALING POWER", "I THINK", "I THINK PEOPLE NEED TO BE EDUCATED", "MUSIC HAS", "MUSIC HAS HEALING POWER IT HAS THE ABILITY TO TAKE A"],
  ["Johnny Cash", "Walk", "I WALK THE LINE", "Morning2", "GET RHYTHM WHEN YOU GET THE BLUES", "YOU BUILD", "YOU BUILD ON FAILURE AND YOU USE IT AS A STEPPING ALL"],
  ["Usain Bolt", "Not Easy", "EASY IS NOT AN EVERY", "Worry Not", "WORRYING GETS YOU ALWAYS", "Learn3", "THERE ARE BETTER STARTERS THAN ME BUT I AM A STRONG FINISHER"],
  ["Simone Biles", "Self Care", "IT IS OKAY TO NOT BE THE", "Trust Body", "TRUST YOUR BODY AND TRUST YOUR FOREVER", "Practice3", "HARD DAYS ARE THE BEST BECAUSE THATS WHEN CHAMPIONS ARE MADE"],
  ["Billie Jean King", "Pressure", "PRESSURE IS A PRIVILEGE", "State Mind", "WINNING IS A STATE OF MIND", "Change3", "BE BOLD IF YOU ARE GOING TO MAKE AN ERROR MAKE A DOOZY"],
  ["Arthur Ashe", "Start Here", "START WHERE YOU ARE", "Success5", "SUCCESS IS A JOURNEY NOT A DESTINATION", "Start2", "START WHERE YOU ARE USE WHAT YOU HAVE DO WHAT YOU CAN"],
  ["Michael Phelps", "Be Best", "I WANT TO BE THE BEST", "Records2", "RECORDS ARE ALWAYS MADE TO BE BROKEN", "Set Mind", "THERE IS NOTHING YOU CANNOT DO IF YOU SET YOUR MIND TO IT"],
  ["Lionel Messi", "Ball", "I JUST WANT THE BALL", "Ball", "THE BALL IS MY BEST FRIEND", "Team", "EVERY YEAR I TRY TO GROW AS A PLAYER AND NOT GET STUCK IN A RUT"],
  ["Mia Hamm", "Better", "MAKE YOURSELF BETTER", "Goals", "SCORE GOALS AND WIN GAMES", "Somewhere", "SOMEWHERE BEHIND THE ATHLETE YOU HAVE BECOME IS THE CHILD WHO FELL IN LOVE WITH THE GAME"],
  ["Andre Agassi", "Return", "RETURN EVERY BALL", "Tennis3", "IF YOU DONT PRACTICE YOU DONT DESERVE TO WIN", "Win7", "WINNING CHANGES EVERYTHING WINNING MAKES YOU BETTER"],
  ["Arnold Palmer", "Swing Hard", "SWING HARD AND FAST", "Swing", "SWING YOUR SWING NOT SOME OTHER GUYS SWING", "Success", "SUCCESS IN GOLF DEPENDS LESS ON STRENGTH THAN CALM"],
  ["Abby Wambach", "Bold", "ALWAYS BE BOLD", "Failure3", "FAILURE IS JUST FUEL FOR SUCCESS", "Champion", "A REAL CHAMPION KEEPS FIGHTING NO MATTER HOW HARD THE BATTLE GETS"],
  ["Nadia Comaneci", "Perfect Aim", "AIM FOR PERFECTION", "Enjoy", "ENJOY THE JOURNEY AND TRY TO GET BETTER EVERY DAY", "Perfect3", "I DONT RUN AWAY FROM A CHALLENGE BECAUSE I AM AFRAID"],
  ["Lou Gehrig", "Never Quit", "NEVER QUIT PLAYING", "Life9", "EVERY DAY IS A NEW OPPORTUNITY", "Iron Horse", "PLAY THE GAME WITH ALL YOUR HEART AND SOUL EVERY SINGLE DAY"],
  ["Hank Aaron", "Keep Going", "I HAD TO KEEP GOING", "Gift2", "THE TRIPLE IS THE MOST EXCITING PLAY IN BASEBALL", "Barrier", "I NEVER DOUBTED MY ABILITY BUT I WAS AFRAID OF HOW PEOPLE MIGHT REACT"],
  ["Jim Brown", "Grit Show", "SHOW SOME GRIT", "Every Last", "I PLAYED EVERY GAME LIKE IT WAS MY THE", "Make", "MAKE SURE YOUR WORST ENEMY IS NOT LIVING BETWEEN YOUR OWN TWO EARS"],
  ["Joe Montana", "Calm Win", "A CALM MIND THE", "Compete", "THE DRIVE TO WIN BURNS DEEP INSIDE ME", "Calm", "CONFIDENCE IS PREPARATION EVERYTHING ELSE IS BEYOND YOUR CONTROL"],
  ["Jerry Rice", "Best Work", "WORK TO BE THE BEST", "Last Play", "PLAY EVERY PLAY LIKE IT IS YOUR THE", "Today2", "TODAY I WILL DO WHAT OTHERS WONT SO TOMORROW I CAN ACCOMPLISH WHAT OTHERS CANT"],
  ["Walter Payton", "Best Always", "GIVE YOUR BEST ALWAYS", "Tomorrow4", "TOMORROW IS PROMISED TO NO ONE", "Never2", "NEVER DIE EASY WHEN IT IS THIRD AND TEN YOU GOT TO KEEP THE DRIVE ALIVE"],
  ["Pat Summitt", "Attitude", "ATTITUDE IS A EVERY", "Definite", "IT IS WHAT IT IS BUT IT WILL BE WHAT YOU MAKE IT", "Outwork", "HERE IS HOW I AM GOING TO BEAT YOU I AM GOING TO OUTWORK IT"],
  ["Jim Valvano", "Hope Never", "NEVER LOSE THE", "Day3", "DONT GIVE UP DONT EVER GIVE UP", "Laugh2", "TO ME THERE ARE THREE THINGS WE ALL SHOULD DO EVERY DAY NUMBER ONE IS LAUGH"],
  ["Tony Dungy", "Faith Win", "FAITH LEADS TO WINS", "Right Way", "YOU CAN WIN AND STILL DO IT THE RIGHT WAY", "Mentor", "MENTOR LEADERS ARE DISCIPLINED IN THEIR APPROACH"],
  ["Peyton Manning", "Your Craft", "FOCUS ON YOUR CRAFT", "Preparation", "PREPARATION IS THE KEY TO SUCCESS", "Pressure2", "PRESSURE IS SOMETHING YOU FEEL WHEN YOU DONT KNOW WHAT THE HECK YOU ARE DOING"],
  ["Drew Brees", "Play Heart", "PLAY WITH ALL YOUR HEART", "Legacy", "MAKE EVERY DAY A MASTERPIECE", "Dream Humble", "DREAM BIG WORK HARD AND STAY HUMBLE AND GOOD THINGS WILL COME"],
  ["Kareem Abdul Jabbar", "Sky Hook", "THE SKY HOOK IS MINE", "Learn Read", "READING OPENS YOUR MIND TO THE WORLD", "Mind5", "ONE MAN CAN BE A CRUCIAL INGREDIENT ON A TEAM BUT ONE MAN CANNOT MAKE A TEAM"],
  ["Bill Russell", "Lead Front", "LEAD FROM THE FRONT", "Commit", "COMMITMENT STARTS WITH A CHOICE", "Win12", "CREATE UNSELFISHNESS AS THE MOST IMPORTANT TEAM ATTRIBUTE"],
  ["Oscar Robertson", "Play Right", "PLAY THE GAME RIGHT", "Play6", "BASKETBALL IS A TEAM GAME NOT A TALENT SHOW", "Fundamentals", "YOU LEARN FUNDAMENTALS SO THAT YOU WOULD NOT HAVE TO WORRY ABOUT THEM DURING THE GAME"],
  ["Charles Barkley", "Not Role", "I AM NOT A ROLE MODEL", "Role", "I AM NOT A ROLE MODEL I AM JUST A BASKETBALL PLAYER", "Work Right", "JUST BECAUSE YOU WORK HARD DOES NOT MEAN YOU ARE DOING SOMETHING THE"],
  ["Kevin Durant", "HARD WORK", "HARD WORK PAYS", "Basketball", "BASKETBALL IS MY PASSION I LOVE IT", "Slim", "I KNOW WHO I AM I KNOW WHAT I BELIEVE AND THATS ALL I NEED TO KNOW"],
  ["Dwyane Wade", "LEAD YOUR", "LEAD YOUR TEAM", "Heat", "I GAVE MIAMI EVERYTHING I HAD", "Chase", "IF YOU ARE GOING TO CHASE YOUR DREAM YOU HAVE TO RUN FASTER THAN EVERYONE ELSE"],
  ["Chris Paul", "Family", "FAMILY OVER EVERYTHING", "I WANT", "I WANT TO WIN MORE THAN ALL", "Lead Team", "YOUR NAME IS THE MOST IMPORTANT THING YOU OWN DONT EVER LET ANYBODY TAKE THAT"],
  ["Bobby Orr", "Speed", "SPEED WINS ALL", "Hockey", "WHEN I WAS YOUNG I JUST WANTED TO PLAY HOCKEY", "Flying", "I KNEW AT A VERY YOUNG AGE THAT I WANTED TO BE A HOCKEY PLAYER"],
  ["Rafael Nadal", "Fight", "I FIGHT EVERY POINT", "Fight3", "I PLAY EACH POINT LIKE MY LIFE DEPENDS ON IT", "Train", "EVERY DAY I TRAIN LIKE IT IS THE MOST IMPORTANT DAY OF MY LIFE"],
  ["Novak Djokovic", "Self", "I BELIEVE IN MYSELF", "Mind6", "THE MIND IS THE MOST POWERFUL WEAPON IN THE WORLD", "Champion", "A TRUE CHAMPION NEVER STOPS WORKING TO GET BETTER EACH DAY"],
  ["Martina Navratilova", "Risk", "TAKE RISKS AND GROW", "Die", "WHENEVER I LOSE I LEARN FROM IT", "Courage", "IT TAKES COURAGE TO GROW UP AND BECOME WHO YOU TRULY ARE TODAY"],
  ["Lindsey Vonn", "STRENGTH AND", "STRENGTH AND SKILL", "Mountain", "WHEN YOU FALL GET RIGHT BACK UP", "Ski", "I CAN PUSH MYSELF TO THE LIMIT AND THAT IS WHAT I LIVE FOR"],
  ["Chloe Kim", "Gold", "I AM JUST LIVING MY DREAM", "Snow", "STAY TRUE TO YOURSELF AND BELIEVE IN YOUR DREAMS", "I THINK", "I THINK IT IS REALLY IMPORTANT TO STAY TRUE TO WHO BE"],
  ["Michelle Kwan", "Ice Dreams", "WORK HARD BE YOURSELF", "Grace", "WORK HARD BE YOURSELF AND HAVE FUN", "I ALWAYS", "I ALWAYS TELL YOUNG KIDS TO FIND WHAT MAKES YOUR ALL"],
  ["Peggy Fleming", "GRACE ON", "GRACE ON BE", "Elegant", "THE FIRST THING IS TO LOVE YOUR SPORT", "Dance2", "FIGURE SKATING IS AN INCREDIBLE MIX OF ART AND ATHLETICISM"],
  ["Francis Bacon", "KNOWLEDGE IS", "KNOWLEDGE IS TRUE POWER", "Reading", "READING MAKETH A FULL MAN", "Revenge", "IN TAKING REVENGE A MAN IS BUT EVEN WITH HIS ENEMY BUT IN PASSING IT OVER HE IS SUPERIOR"],
  ["Honore de Balzac", "BEHIND EVERY", "BEHIND EVERY GREAT", "Love Laws", "THE MORE WE JUDGE THE LESS WE LOVE", "Equality", "EQUALITY MAY PERHAPS BE A RIGHT BUT NO HUMAN POWER CAN EVER TURN IT INTO A FACT"],
  ["Simone de Beauvoir", "I AM", "I AM TRULY GRATEFUL", "Ethics", "ONE IS NOT BORN A GENIUS ONE BECOMES A GENIUS", "ONE IS", "ONE IS NOT BORN A WOMAN ONE BECOMES ONE THAT IS THE BE"],
  ["Samuel Beckett", "Go On", "I CAN NOT GO ON I WILL GO ON", "Birth Death", "THEY GIVE BIRTH ASTRIDE OF A GRAVE", "Fail Better", "EVER TRIED EVER FAILED NO MATTER TRY AGAIN FAIL AGAIN FAIL BETTER"],
  ["Ludwig van Beethoven", "Music", "MUSIC IS A GIFT", "Noble Deed", "I MUST CONFESS THAT I LEAD A MISERABLE LIFE", "Music", "MUSIC IS A HIGHER REVELATION THAN ALL WISDOM AND PHILOSOPHY"],
  ["Alexander Graham Bell", "WHEN DOORS", "WHEN DOORS", "WHEN ONE", "WHEN ONE DOOR CLOSES BEEN", "Discovery", "THE INVENTOR LOOKS UPON THE WORLD AND IS NOT CONTENTED WITH THINGS AS THEY ARE"],
  ["Ambrose Bierce", "DEVIL AND", "DEVIL AND A", "WAR IS", "WAR IS GODS WAY OF ALL BEEN", "Definitions", "SPEAK WHEN YOU ARE ANGRY AND YOU WILL MAKE THE BEST SPEECH YOU WILL EVER REGRET"],
  ["William Blake", "ENERGY IS", "ENERGY IS DELIGHT", "Joy Sorrow", "EXCESS OF SORROW LAUGHS EXCESS OF JOY WEEPS", "Eternity", "TO SEE A WORLD IN A GRAIN OF SAND AND A HEAVEN IN A WILD FLOWER"],
  ["Jorge Luis Borges", "DREAM AND", "DREAM AND THEN LIVE", "Universe", "THE UNIVERSE WHICH OTHERS CALL THE LIBRARY", "Time", "TIME IS THE SUBSTANCE FROM WHICH I AM MADE TIME IS A RIVER WHICH SWEEPS ME ALONG"],
  ["Edmund Burke", "Evil", "THE ONLY THING", "THE ONLY", "THE ONLY THING NECESSARY FOR GOOD", "Evil Triumph", "THE ONLY THING NECESSARY FOR THE TRIUMPH OF EVIL IS FOR GOOD MEN TO DO NOTHING"],
  ["Albert Camus", "Sun Life", "IN THE DEPTH OF WINTER", "Absurd Hero", "ONE MUST IMAGINE SISYPHUS HAPPY", "IN THE", "IN THE DEPTH OF WINTER I FOUND THERE WAS IN ME AN BEEN"],
  ["Thomas Carlyle", "WORK ALONE", "WORK ALONE IS NOBLE", "Sincerity", "SINCERITY IS THE WAY TO HEAVEN", "Laughter", "NO MAN WHO HAS ONCE HEARTILY AND WHOLLY LAUGHED CAN BE ALTOGETHER IRRECLAIMABLY BAD"],
  ["Lewis Carroll", "Madness", "WE ARE ALL MAD HERE", "Sentence", "SENTENCE FIRST VERDICT AFTERWARDS", "IT IS", "IT IS NO USE GOING BACK TO YESTERDAY BECAUSE I WAS A A"],
  ["Willa Cather", "TAKE THE", "TAKE THE ROUGH PATH", "Desire", "THE END IS NOTHING THE ROAD IS ALL", "Winter", "THERE ARE SOME THINGS YOU LEARN BEST IN CALM AND SOME IN STORM"],
  ["Miguel de Cervantes", "ALL THAT", "ALL THAT GLISTERS", "Sleep", "BLESSINGS ON HIM WHO FIRST INVENTED SLEEP", "Knight Quest", "THE TRUTH MAY BE STRETCHED THIN BUT IT NEVER BREAKS"],
  ["Anton Chekhov", "ANY FOOL", "ANY FOOL BE", "Happiness", "IF YOU ARE AFRAID OF LONELINESS DO NOT MARRY", "IF YOU", "IF YOU ARE AFRAID OF LONELINESS DO NOT MARRY FOR THE WORLD IS VAST AND WIDE"],
  ["Agatha Christie", "EVIL IS", "EVIL IS NOT SIMPLE", "Vanish", "VERY FEW OF US ARE WHAT WE SEEM", "I LIKE", "I LIKE LIVING I HAVE SOMETIMES BEEN WILDLY DESPAIRING AND DEEPLY ACUTELY MISERABLE"],
  ["Paulo Coelho", "Heart Path", "FOLLOW YOUR HEART", "Warrior", "A WARRIOR OF LIGHT VALUES HIS DREAMS", "Journey", "IT IS THE POSSIBILITY OF HAVING A DREAM COME TRUE THAT MAKES LIFE INTERESTING"],
  ["Joseph Conrad", "Darkness", "THE HORROR THE HORROR", "WE LIVE", "WE LIVE AS WE DREAM ALL ALL", "Work", "I DO NOT LIKE WORK BUT I LIKE WHAT IS IN THE WORK THE CHANCE TO FIND YOURSELF"],
  ["Marie Curie", "BE LESS", "BE LESS AFRAID NOW", "BE LESS", "BE LESS CURIOUS ABOUT ALL", "Science", "BE LESS CURIOUS ABOUT PEOPLE AND MORE CURIOUS ABOUT IDEAS"],
  ["Charles Darwin", "EVOLVE OR", "EVOLVE OR A", "Observation", "I LOVE FOOLS EXPERIMENTS I AM ALWAYS MAKING THEM", "Ignorance", "IGNORANCE MORE FREQUENTLY BEGETS CONFIDENCE THAN DOES KNOWLEDGE"],
  ["Alexandre Dumas", "HOPE WILL", "HOPE WILL COME", "Life Chain", "LIFE IS A STORM MY YOUNG FRIEND", "Wait Hope", "ALL HUMAN WISDOM IS SUMMED UP IN TWO WORDS WAIT AND HOPE"],
  ["George Eliot", "IT IS", "IT IS NEVER TOO", "Too Late", "IT IS NEVER TOO LATE TO BE WHAT YOU MIGHT HAVE BEEN", "IT IS", "IT IS NEVER TOO LATE TO BE WHAT YOU MIGHT HAVE BEEN BE"],
  ["T S Eliot", "ONLY THOSE", "ONLY THOSE WHO RISK", "Dare", "DO I DARE DISTURB THE UNIVERSE", "Risk", "ONLY THOSE WHO WILL RISK GOING TOO FAR CAN POSSIBLY FIND OUT HOW FAR ONE CAN GO"],
  ["Euripides", "LOVE IS", "LOVE IS ALL WE HAVE", "Cleverness", "CLEVERNESS IS NOT WISDOM", "Love", "LOVE IS ALL WE HAVE THE ONLY WAY THAT EACH CAN HELP THE OTHER"],
  ["William Faulkner", "Past", "THE PAST IS NOT", "Memory", "MEMORY BELIEVES BEFORE KNOWING REMEMBERS", "Pouring Sweat", "I ONLY WRITE WHEN INSPIRATION STRIKES FORTUNATELY IT STRIKES EVERY MORNING AT NINE"],
  ["F Scott Fitzgerald", "Jazz Age", "SO WE BEAT ON BOATS", "THERE ARE", "THERE ARE ALL KINDS OF LOVE IN THE WORLD", "Green Light", "SO WE BEAT ON BOATS AGAINST THE CURRENT BORNE BACK CEASELESSLY INTO THE PAST"],
  ["Gustave Flaubert", "WRITING IS", "WRITING IS", "THE ART", "THE ART OF WRITING IS BEEN", "Writing", "THE ART OF WRITING IS THE ART OF DISCOVERING WHAT YOU BELIEVE"],
  ["Kahlil Gibran", "YOUR SOUL", "YOUR SOUL IS LIGHT", "YOUR CHILDREN", "YOUR CHILDREN ARE NOT YOUR OWN", "Freedom", "LIFE WITHOUT LOVE IS LIKE A TREE WITHOUT BLOSSOMS OR FRUIT"],
  ["Johann Wolfgang von Goethe", "Bold", "BE BOLD AND ACT", "WHATEVER YOU", "WHATEVER YOU CAN DO OR DREAM IT", "Boldness", "WHATEVER YOU CAN DO OR DREAM YOU CAN BEGIN IT BOLDNESS HAS GENIUS POWER AND MAGIC IN IT"],
  ["Vincent van Gogh", "I DREAM", "I DREAM MY PAINTING", "Starlight", "I DREAM MY PAINTING AND I PAINT MY DREAM", "Stars", "FOR MY PART I KNOW NOTHING WITH ANY CERTAINTY BUT THE SIGHT OF THE STARS MAKES ME DREAM"],
  ["Baltasar Gracian", "A WISE", "A WISE MAN A", "Knowledge", "WITHOUT COURAGE WISDOM BEARS NO FRUIT", "Wise Words", "A WISE MAN GETS MORE USE FROM HIS ENEMIES THAN A FOOL FROM HIS FRIENDS"],
  ["Thomas Hardy", "TIME CHANGES", "TIME CHANGES A", "TIME CHANGES", "TIME CHANGES EVERYTHING", "Happiness", "HAPPINESS WAS BUT THE OCCASIONAL EPISODE IN A GENERAL DRAMA OF PAIN"],
  ["Nathaniel Hawthorne", "TIME FLIES", "TIME FLIES BEYOND", "Easy Read", "EASY READING IS DAMN HARD WRITING", "Sunshine", "HAPPINESS IS A BUTTERFLY WHICH WHEN PURSUED IS ALWAYS JUST BEYOND YOUR GRASP"],
  ["Ernest Hemingway", "True", "WRITE ONE TRUE", "True Words", "ALL YOU HAVE TO DO IS WRITE ONE TRUE SENTENCE", "Strong Break", "THE WORLD BREAKS EVERYONE AND AFTERWARD MANY ARE STRONG AT THE BROKEN PLACES"],
  ["Heraclitus", "Character", "CHARACTER IS DESTINY", "Eyes Ears", "EYES ARE MORE ACCURATE WITNESSES THAN EARS", "NO MAN", "NO MAN EVER STEPS IN THE SAME RIVER TWICE FOR IT IS NOT THE SAME RIVER AND HE IS NOT THE SAME"],
  ["Hermann Hesse", "River Song", "THE RIVER IS EVERYWHERE", "WITHIN YOU", "WITHIN YOU THERE IS A QUIET PEACE", "EVERY MANS", "EVERY MANS STORY IS IMPORTANT ETERNAL SACRED FOR A"],
  ["Hippocrates", "Heal First", "LET FOOD BE THY MEDICINE", "Food", "LET FOOD BE THY MEDICINE AND MEDICINE BE THY FOOD", "WHEREVER THE", "WHEREVER THE ART OF MEDICINE IS LOVED THERE IS ALSO A LOVE OF HUMANITY AND HOPE"],
  ["Homer", "Dawn", "ROSY FINGERED DAWN", "Wine Dark", "WINE CAN OF THEIR WITS THE WISE BEGUILE", "THERE IS", "THERE IS A TIME FOR MANY WORDS AND THERE IS ALSO A TIME FOR SLEEP AND DREAMS"],
  ["Aldous Huxley", "Dreams", "DREAM IN A PRAGMATIC WAY", "Knowledge", "THE MORE YOU KNOW THE MORE YOU SEE", "THERE ARE", "THERE ARE THINGS KNOWN AND THERE ARE THINGS BE BEEN"],
  ["Henrik Ibsen", "A STRONG", "A STRONG MAN STANDS", "Duty", "YOUR FIRST DUTY IS TO YOURSELF", "Majority", "THE MAJORITY IS ALWAYS WRONG THE MINORITY IS RARELY RIGHT"],
  ["Washington Irving", "Great", "GREAT MINDS THINK", "GREAT MINDS", "GREAT MINDS HAVE PURPOSES IN LIFE", "Eloquence", "THE TONGUE IS THE ONLY INSTRUMENT THAT GETS SHARPER WITH USE"],
  ["William James", "Mind Free", "ACT AS IF WHAT YOU DO", "Will Power", "THE GREATEST WEAPON AGAINST STRESS IS OUR", "Wisdom", "THE ART OF BEING WISE IS THE ART OF KNOWING WHAT TO OVERLOOK"],
  ["James Joyce", "WRITE YOUR", "WRITE YOUR OWN SOUL", "Errors", "ERRORS ARE THE PORTALS OF DISCOVERY", "Art Soul", "THE ARTIST LIKE THE GOD OF THE CREATION REMAINS WITHIN OR BEHIND OR BEYOND OR ABOVE HIS HANDIWORK"],
  ["Franz Kafka", "Cage", "A CAGE WENT OUT", "Books Axe", "A BOOK MUST BE THE AXE FOR THE FROZEN SEA INSIDE US", "Logic", "LOGIC MAY INDEED BE UNSHAKEABLE BUT IT CAN NOT WITHSTAND A MAN WHO IS DETERMINED TO LIVE"],
  ["Rudyard Kipling", "If", "KEEP YOUR HEAD", "Garden", "GARDENS ARE NOT MADE BY SITTING IN THE SHADE", "If", "IF YOU CAN KEEP YOUR HEAD WHEN ALL ABOUT YOU ARE LOSING THEIRS"],
  ["D H Lawrence", "THE LIVING", "THE LIVING SPIRIT", "Freedom", "THE PROPER FUNCTION OF MAN IS TO LIVE NOT TO EXIST", "Trust Body", "THE HUMAN BODY IS THE BEST PICTURE OF THE HUMAN SOUL"],
  ["Ursula K Le Guin", "Star Words", "WE LIVE IN CAPITALISM", "Words Power", "WE READ BOOKS TO FIND OUT WHO WE ARE", "THE ONLY", "THE ONLY THING THAT MAKES LIFE POSSIBLE IS NOT BEEN"],
  ["Jack London", "Wild", "THE CALL OF THE WILD", "Life Call", "I WOULD RATHER BE ASHES THAN DUST", "Purpose", "YOU CAN NOT WAIT FOR INSPIRATION YOU HAVE TO GO AFTER IT WITH A CLUB"],
  ["Henry Wadsworth Longfellow", "ACT IN", "ACT IN THE PRESENT", "Rain", "INTO EACH LIFE SOME RAIN MUST FALL", "Great Acts", "THE HEIGHTS BY GREAT MEN REACHED AND KEPT WERE NOT ATTAINED BY SUDDEN FLIGHT"],
  ["Niccolo Machiavelli", "Power Play", "IT IS MUCH SAFER TO", "IT IS", "IT IS MUCH SAFER TO BE FEARED THAN LOVED", "Fortune", "FORTUNE IS A WOMAN AND IT IS NECESSARY TO KEEP HER UNDER"],
  ["Thomas Mann", "Write", "A WRITERS TASK", "A WRITERS", "A WRITERS PROBLEM DOES NOT CHANGE MUCH", "Solitude", "SOLITUDE GIVES BIRTH TO THE ORIGINAL IN US TO BEAUTY UNFAMILIAR AND PERILOUS TO POETRY"],
  ["Michelangelo", "Learning", "I AM STILL LEARNING", "Beauty Purge", "BEAUTY IS THE PURGATION OF SUPERFLUITIES", "Vision", "I SAW THE ANGEL IN THE MARBLE AND CARVED UNTIL I SET HIM FREE"],
  ["Ronnie Wood", "Rock Life", "ROCK AND ROLL IS MY THE", "Art Soul", "MUSIC AND ART FEED THE THE", "Creative", "CREATIVITY FLOWS WHEN YOU STOP THINKING AND START FEELING"],
  ["Charlie Parker", "Blow Horn", "JUST BLOW YOUR HORN", "Music Own", "MUSIC IS YOUR OWN EXPERIENCE", "No Line", "THEY SAY THERE IS A BOUNDARY LINE TO MUSIC BUT THERE IS NONE"],
  ["Ornette Coleman", "Jazz Music", "JAZZ IS THE ONLY MUSIC", "Sound Not", "PLAYING MUSIC IS NOT ABOUT NOTES IT IS ABOUT THAT", "Free Play", "THE ONLY WAY TO PLAY FREE IS TO NOT THINK ABOUT WHAT YOU PLAY"],
  ["Art Blakey", "Drums Heart", "DRUMS ARE THE HEARTBEAT", "Music Dust", "MUSIC WASHES AWAY THE DUST OF EVERYDAY LIFE", "Soul Music", "JAZZ IS THE MUSIC OF THE SOUL AND IT WILL LIVE ON FOREVER IN OUR HEARTS AND MINDS"],
  ["Max Roach", "The Drum", "THE DRUM IS A VOICE", "Change World", "MUSIC CAN CHANGE THE THAT", "Words Fail", "WE PLAY MUSIC BECAUSE WORDS ARE NOT ENOUGH TO EXPRESS WHAT WE FEEL"],
  ["Buddy Rich", "Best Me", "I AM THE BEST ALWAYS", "No Equal", "THERE IS NO ONE WHO PLAYS DRUMS LIKE I", "Speed Relax", "SPEED AND POWER ON THE DRUMS COME FROM RELAXATION NOT ALWAYS"],
  ["Gene Krupa", "Feel Beat", "FEEL THE BEAT EVERY", "Solo Change", "THE DRUM SOLO CHANGED EVERYTHING IN JAZZ I", "Drive Band", "THE DRUMMER DRIVES THE BAND AND THE BAND DRIVES THE CROWD I"],
  ["Benny Goodman", "My Calling", "SWING IS MY CALLING", "Swing Move", "SWING IS THE THING THAT MAKES PEOPLE MOVE I", "Pure Sound", "A PURE SOUND IS THE MOST BEAUTIFUL THING IN ALL OF MUSIC"],
  ["Glenn Miller", "Found Sound", "I FOUND A SOUND", "Own Sound", "A BAND SHOULD HAVE A SOUND OF ITS IT", "Moon Serenade", "THE MOONLIGHT SERENADE IS THE BEAUTIFUL SOUND OF A WONDERFUL DREAM"],
  ["Tommy Dorsey", "Tone All", "TONE IS EVERYTHING", "Band Sing", "THE BEST BANDS SWING AND SING TOGETHER", "Habit Build", "PERFECTION IS NOT A GOAL IT IS A HABIT YOU BUILD EVERY IT"],
  ["Artie Shaw", "Simple True", "KEEP IT SIMPLE AND THE", "Impossible", "PERFECTION IS IT FOREVER", "Clarinet", "THE CLARINET REQUIRES A LIFETIME OF STUDY AND DEVOTION TO MASTER"],
  ["Althea Gibson", "Give Best", "JUST GIVE YOUR BEST", "Somebody", "I ALWAYS WANTED TO BE SOMEBODY", "Open Door", "I BROKE THE WALL DOWN AND OPENED THE DOOR FOR OTHERS"],
  ["Venus Williams", "Sister", "MY SISTER IS MY ROCK", "Learn Lose", "YOU LEARN MORE FROM LOSING THAN FROM ALWAYS", "Play Bold", "PLAY BOLD AND TAKE RISKS BECAUSE THAT IS HOW YOU WIN BIG"],
  ["Joe Louis", "Fighter Me", "I AM A FIGHTER I", "Hide Not", "YOU CAN RUN BUT YOU CANNOT HIDE", "Ring Home", "THE RING IS WHERE I FOUND MY PURPOSE AND MY STRENGTH"],
  ["Sugar Ray Robinson", "Heart Win", "HEART WINS FIGHTS", "Sweet Ring", "SWEET AS SUGAR IN THE RING", "Box Art", "BOXING IS LIKE A BALLET EXCEPT THERE IS NO MUSIC AND THE DANCERS IT"],
  ["Jesse Owens", "Loved Run", "I ALWAYS LOVED ALWAYS", "Good Praise", "FIND THE GOOD AND PRAISE I", "Victory Self", "THE ONLY VICTORY THAT MATTERS IS THE ONE OVER YOURSELF"],
  ["Wilma Rudolph", "Believe", "BELIEVE IN FOREVER", "Struggle", "TRIUMPH CANNOT BE HAD WITHOUT THE STRUGGLE", "Spirit Power", "NEVER UNDERESTIMATE THE POWER OF DREAMS AND THE INFLUENCE OF THE HUMAN EVERY"],
  ["Florence Griffith Joyner", "Speed Art", "SPEED IS MY ART", "Strong Be", "I BELIEVE IN BEING STRONG", "Try Hard", "WHEN ANYONE TELLS ME I CANNOT DO SOMETHING I JUST TRY HARDER"],
  ["Jackie Joyner Kersee", "Strong Brave", "BE STRONG AND BRAVE", "Work Dedicate", "HARD WORK AND DEDICATION WILL TAKE YOU FAR IN THE", "Look Ahead", "IT IS BETTER TO LOOK AHEAD AND PREPARE THAN TO LOOK BACK AND REGRET"],
  ["Carl Lewis", "Timing", "LIFE IS ABOUT EVERY", "Track Gold", "THE TRACK IS WHERE I FOUND MY TRUE PURPOSE I", "Foundation", "TRAINING IS THE FOUNDATION OF ALL ACHIEVEMENT IN THAT"],
  ["Mary Lou Retton", "Love Gym", "I LOVE GYMNASTICS", "Fire Heart", "EACH OF US HAS A FIRE IN OUR HEARTS FOR SOMETHING I", "Sport Love", "THE LOVE OF THE SPORT KEPT ME GOING THROUGH THE HARD TIMES I"],
  ["Willie Mays", "Love Ball", "I LOVE TO PLAY BALL", "Catch Work", "IT IS NOT HARD TO CATCH A BALL IF YOU WORK AT IT", "Fun Win", "EVERY DAY IS A NEW CHANCE TO PLAY AND WIN AND HAVE FUN"],
  ["Roberto Clemente", "Proud Latin", "I AM A PROUD LATIN IT", "Help Self", "HELP OTHERS AND HELP YOURSELF", "Help Others", "IF YOU HAVE A CHANCE TO HELP OTHERS AND FAIL TO DO SO YOU ARE WASTING YOUR TIME ON EARTH I"],
  ["Casey Stengel", "Manage Win", "MANAGE TO WIN IT ALL", "Not Loser", "I WAS NOT BORN TO BE A LOSER", "Manage Run", "MANAGING IS GETTING PAID FOR HOME RUNS SOMEONE ELSE HITS I"],
  ["Branch Rickey", "Do Right", "DO WHAT IS THAT", "Luck Design", "LUCK IS THE RESIDUE OF DESIGN", "Risk Fail", "THE MAN WHO IS AFRAID TO RISK FAILURE WILL NEVER ACHIEVE TRUE ALWAYS"],
  ["Red Auerbach", "Win Habit", "WINNING IS A HABIT", "Show Loser", "SHOW ME A GOOD LOSER AND I WILL SHOW YOU A THAT", "Forget Win", "THE BEST WAY TO FORGET A BAD GAME IS TO WIN THE NEXT IT"],
  ["Vince Lombardi", "Win", "WIN WITH HEART", "Only Thing", "WINNING IS NOT EVERYTHING IT IS THE ONLY THE", "Get Up", "IT IS NOT WHETHER YOU GET KNOCKED DOWN IT IS WHETHER YOU GET UP"],
  ["Bear Bryant", "Quit Never", "NEVER QUIT ON YOUR THE", "Little Big", "LITTLE THINGS MAKE THE IT FOREVER", "Will Prepare", "IT IS NOT THE WILL TO WIN THAT MATTERS EVERYONE HAS THAT IT IS THE WILL TO PREPARE TO WIN"],
  ["Knute Rockne", "Win Gipper", "WIN ONE FOR THE GIPPER", "One Team", "PLAY AS ONE AND WIN AS ONE TEAM", "Build Up", "BUILD UP YOUR WEAKNESSES UNTIL THEY BECOME YOUR STRONG THAT"],
  ["Tom Landry", "Coach Lead", "COACH AND LEAD WELL", "Discipline", "DISCIPLINE AND FOCUS WIN THAT", "Coach Tell", "A COACH IS SOMEONE WHO TELLS YOU WHAT YOU DONT WANT TO HEAR I"],
  ["Bill Walsh", "Win Smart", "WIN BY BEING SMART", "Score Self", "THE SCORE TAKES CARE OF ITSELF", "Produce", "CONCENTRATE ON WHAT WILL PRODUCE RESULTS RATHER THAN ON THE ALWAYS"],
  ["Chuck Noll", "Task Hand", "FOCUS ON THE TASK AT HAND", "Lose Habit", "WINNING IS A HABIT AND SO IS LOSING", "First Lose", "BEFORE YOU CAN WIN THE GAME YOU MUST FIRST NOT LOSE I"],
  ["Don Shula", "Keep Push", "KEEP PUSHING FORWARD", "Not Satis", "THE ONE THING I NEVER WANT TO BE IS SATISFIED", "Learn Past", "LEARN FROM THE PAST SET GOALS FOR THE FUTURE AND LIVE IN THE MOMENT"],
  ["Bill Belichick", "Do Job", "DO YOUR JOB", "Job Well", "JUST DO YOUR JOB AND DO IT WELL EVERY DAY", "Tough Sign", "THE ONLY SIGN WE HAVE IN THE LOCKER ROOM IS MENTAL TOUGHNESS"],
  ["Geno Auriemma", "Hard Smart", "PLAY HARD AND SMART", "Compete", "COMPETE EVERY SINGLE DAY", "Culture", "THE CULTURE IS SET BY THE STANDARDS YOU HOLD EVERYONE I"],
  ["Mike Krzyzewski", "Next Play", "PLAY THE NEXT PLAY", "Two One", "TWO ARE BETTER THAN ONE IF TWO ACT AS ONE", "Five Finger", "A BASKETBALL TEAM IS LIKE THE FIVE FINGERS ON YOUR HAND"],
  ["Dean Smith", "One Team", "PLAY AS ONE TEAM NOW", "Play Hard", "PLAY HARD PLAY SMART AND PLAY TOGETHER", "Team One", "A TEAM IS NOT ABOUT STARS IT IS ABOUT PLAYING TOGETHER I"],
  ["Bobby Knight", "Play Hard", "PLAY HARD EVERY DAY", "Focused", "STAY FOCUSED AND STAY TOUGH I", "Will Prep", "EVERYONE HAS THE WILL TO WIN BUT FEW HAVE THE WILL TO PREPARE"],
  ["Rick Pitino", "Humble", "STAY HUMBLE AND EVERY", "Hustle Rest", "HUSTLE AND HEART SET THE BEST APART FROM THE REST", "Lead Inspire", "GREAT LEADERS INSPIRE OTHERS TO BELIEVE IN IT FOREVER"],
  ["Roy Williams", "Best Day", "GIVE YOUR BEST EVERY DAY", "Play Fun", "PLAY FAST PLAY HARD AND HAVE FUN DOING I", "Trophy", "I CARE MORE ABOUT MY PLAYERS THAN ANY GAME OR TROPHY"],
  ["Jay Wright", "Set High", "SET HIGH STANDARDS", "Culture Win", "CULTURE BEATS STRATEGY EVERY THE", "Ahead Team", "GREAT TEAMS PUT THE TEAM AHEAD OF THEMSELVES EVERY SINGLE IT"],
  ["Mike Tomlin", "Focus", "STAY FOCUSED ON THE TASK", "Standard", "THE STANDARD IS THE STANDARD", "Hopes Live", "WE DO NOT LIVE IN OUR FEARS WE LIVE IN OUR HOPES AND EVERY"],
  ["Andy Reid", "Never Stop", "NEVER STOP WORKING", "Time Value", "TIME IS THE MOST VALUABLE THING WE HAVE", "Care Win", "TAKE CARE OF YOUR PLAYERS AND THEY WILL TAKE CARE OF WINNING"],
  ["Bill Parcells", "Job Good", "JUST DO YOUR IT", "Record", "YOU ARE WHAT YOUR RECORD SAYS YOU ARE", "Coach Fire", "COACHING IS NOTHING MORE THAN ELIMINATING MISTAKES BEFORE YOU GET THAT"],
  ["Barry Sanders", "End Zone", "THE END ZONE IS MY HOME", "Let Talk", "LET YOUR PLAY DO THE TALKING I", "Field Talk", "I NEVER FELT THE NEED TO TALK ABOUT WHAT I DID ON THE THAT"],
  ["Emmitt Smith", "Keep Run", "KEEP RUNNING FORWARD", "Run Hard", "RUN HARD AND NEVER LOOK BACK I", "All Equal", "ALL MEN ARE CREATED EQUAL SOME WORK HARDER IN THE PRESEASON"],
  ["Aaron Rodgers", "Relax Play", "RELAX AND PLAY YOUR GAME", "Noise Focus", "BLOCK OUT THE NOISE AND FOCUS ON WHAT ALWAYS", "Trust Field", "TRUST IN YOUR PREPARATION AND YOUR ABILITIES ON THE FIELD"],
  ["Patrick Mahomes", "Win Goal", "WINNING IS THE GOAL", "Arm Trust", "I TRUST MY ARM AND MY INSTINCTS", "Love Fun", "I PLAY THE GAME BECAUSE I LOVE IT AND BECAUSE IT IS IT"],
  ["Kobe Bryant", "Fear None", "I FEAR NOTHING AND NO ONE", "Mamba Way", "THE MAMBA WAY IS THE ONLY WAY I KNOW", "Rise Show", "EVERYTHING NEGATIVE IS AN OPPORTUNITY TO RISE AND SHOW YOUR TRUE CHARACTER"],
  ["Tim Duncan", "Basics", "MASTER THE BASICS FIRST", "Bank", "NEVER LET GOOD ENOUGH BE GOOD ENOUGH", "Team More", "THE TEAM IS ALWAYS MORE IMPORTANT THAN ANY ONE PLAYER I"],
  ["Shaquille ONeal", "Dominate", "JUST DOMINATE", "Lead Heart", "LEAD WITH YOUR HEART AND SOUL", "Size Skill", "SIZE AND SKILL TOGETHER MAKE AN UNSTOPPABLE FORCE ON THE THE"],
  ["Wilt Chamberlain", "Play Big", "PLAY BIG AND WIN BIG", "Big Root", "NOBODY ROOTS FOR THE BIG GUY I", "Dominate", "I DOMINATED THE GAME LIKE NO ONE BEFORE ME AND NO ONE AFTER I"],
  ["Jerry West", "Logo", "JUST PLAY HARD", "Better Craft", "I NEVER STOPPED TRYING TO GET BETTER AT MY CRAFT I", "Feel Good", "YOU CANNOT GET MUCH DONE IN LIFE IF YOU ONLY WORK ON THE DAYS WHEN YOU FEEL GOOD"],
  ["Julius Erving", "Ball Art", "BASKETBALL IS AN IT", "Style Heart", "PLAY WITH STYLE AND PLAY WITH THAT", "Above Rim", "I COULD GO ABOVE THE RIM AND THAT CHANGED THE GAME FOREVER I"],
  ["Hakeem Olajuwon", "Be Best", "BE THE BEST AT WHAT YOU DO", "Post Art", "MY POST MOVES WERE MY ART FORM", "Footwork", "GREAT FOOTWORK IS THE KEY TO DOMINATING IN THE POST"],
  ["Karl Malone", "Deliver", "I DELIVER EVERY NIGHT", "Mailman", "THE MAILMAN ALWAYS DELIVERS ON TIME", "Talent Work", "HARD WORK BEATS TALENT WHEN TALENT DOES NOT WORK HARD ENOUGH"],
  ["Rabindranath Tagore", "WHERE THE", "WHERE THE MIND LED", "Silent Depths", "THE FISH IN THE WATER IS SILENT", "Love", "LOVE IS THE ONLY REALITY AND IT IS NOT A MERE SENTIMENT IT IS THE ULTIMATE TRUTH"],
  ["Robert Louis Stevenson", "JOURNEYS ARE", "JOURNEYS ARE WORTH", "Starry Rest", "UNDER THE WIDE AND STARRY SKY", "Joyful World", "THE WORLD IS SO FULL OF A NUMBER OF WONDERFUL THINGS"],
  ["Alex Morgan", "FIGHT FOR", "FIGHT FOR YOUR GOAL", "Believe", "BELIEVE YOU CAN AND YOU WILL SUCCEED", "Give Back", "THE GAME HAS GIVEN ME EVERYTHING AND I WANT TO GIVE IT ALL BACK"],
  ["Dirk Nowitzki", "PLAY THE", "PLAY THE BE", "Champion", "ONE CITY ONE TEAM ONE GOAL", "Grit", "CHAMPIONSHIPS ARE WON THROUGH SACRIFICE AND DEDICATION"],
  ["Mario Lemieux", "SKATE WITH", "SKATE WITH", "Skill", "LET YOUR SKILL DO THE TALKING ON THE ICE", "Comeback", "A TRUE CHAMPION FINDS A WAY TO COME BACK STRONGER THAN BEFORE"],
  ["Paul Pierce", "THE TRUTH", "THE TRUTH WINS", "Clutch", "I WANT THE BALL IN THE FINAL MOMENT", "Boston", "THIS IS MY CITY AND I WILL DEFEND IT WITH EVERYTHING"],
  ["Steve Nash", "PASS WITH", "PASS WITH A", "THE GAME", "THE GAME IS ALL ABOUT BEEN", "THE GAME", "THE GAME IS ALL ABOUT FINDING THE OPEN MAN AND A BEEN"],
  ["Rousseau", "MAN IS", "MAN IS BORN", "MAN IS", "MAN IS BORN FREE AND EVERYWHERE HE IS BOUND", "MAN IS", "MAN IS BORN FREE AND EVERYWHERE HE IS IN CHAINS HE THINKS HE IS THE MASTER OF ALL OTHERS"],
  ["Montesquieu", "POWER CORRUPTS", "POWER CORRUPTS BE", "POWER CORRUPTS", "POWER CORRUPTS AND ABSOLUTE POWER CORRUPTS ALL", "POWER CORRUPTS", "POWER CORRUPTS AND ABSOLUTE POWER CORRUPTS A BEEN"],
  ["Octavia Butler", "ALL THAT", "ALL THAT BE", "ALL THAT", "ALL THAT YOU TOUCH YOU ALL", "ALL THAT", "ALL THAT YOU TOUCH YOU CHANGE AND ALL THAT YOU A BEEN"],
  ["Gloria Steinem", "THE TRUTH", "THE TRUTH WILL", "THE TRUTH", "THE TRUTH WILL SET YOU FREE BUT FIRST IT WILL", "THE TRUTH", "THE TRUTH WILL SET YOU FREE BUT FIRST IT WILL MAKE YOU VERY ANGRY AND THAT IS QUITE NORMAL"],
  ["Simone Weil", "ATTENTION IS", "ATTENTION IS A", "ATTENTION IS", "ATTENTION IS THE RAREST A", "ATTENTION IS", "ATTENTION IS THE RAREST AND PUREST FORM OF ALL BEEN"],
  ["Hannah Arendt", "THE SAD", "THE SAD ALL", "THE SAD", "THE SAD TRUTH IS MOST EVIL IS DONE BY PEOPLE", "THE SAD", "THE SAD TRUTH IS THAT MOST EVIL IS DONE BY PEOPLE WHO"],
  ["Virginia Woolf", "YOU CANNOT", "YOU CANNOT", "YOU CANNOT", "YOU CANNOT FIND PEACE BY A", "YOU CANNOT", "YOU CANNOT FIND PEACE BY AVOIDING LIFE YOU MUST ALL"],
  ["Sylvia Plath", "I TOOK", "I TOOK A ALL", "I TOOK", "I TOOK A DEEP BREATH AND LISTENED TO THE OLD", "I TOOK", "I TOOK A DEEP BREATH AND LISTENED TO THE OLD BRAG OF A"],
  ["Edith Wharton", "THERE ARE", "THERE ARE A", "THERE ARE", "THERE ARE TWO WAYS OF SPREADING LIGHT BE THE", "THERE ARE", "THERE ARE TWO WAYS OF SPREADING LIGHT TO BE THE CANDLE OR THE MIRROR THAT REFLECTS IT ALL"],
  ["Sidney Crosby", "Compete", "COMPETE EVERY DAY", "EVERY DAY", "EVERY DAY IS A GOOD DAY TO BE YOUR BEST", "Work", "THE WORK YOU PUT IN WHEN NOBODY IS WATCHING DEFINES YOU"],
  ["Giannis Antetokounmpo", "Freak", "RUN HARD JUMP HIGH", "I WANT", "I WANT TO BE THE BEST PLAYER THAT I CAN", "I WANT", "I WANT TO BE THE BEST PLAYER THAT I CAN BE AND I WORK BE"],
  ["Allen Iverson", "Courage", "FEAR NO ONE", "Size", "HEIGHT DOES NOT MEASURE HEART", "I KNOW", "I KNOW I AM NOT THE BIGGEST GUY OUT THERE BUT I PLAY BE"],
  ["Isiah Thomas", "Heart", "HEART WINS ALL", "Toughness", "MENTAL TOUGHNESS WINS GAMES", "MY GREATEST", "MY GREATEST STRENGTH IS KNOWING MY WEAKNESSES AND"],
  ["Coco Gauff", "Young", "AGE IS JUST A NUMBER", "Young", "AGE IS JUST A NUMBER WHEN YOU BELIEVE", "Dream", "DREAM BIG AND WORK HARD EVERY DAY TO MAKE IT ALL REAL"],
  ["Gordie Howe", "Tough", "PLAY TOUGH EVERY GAME", "Grit", "TOUGHNESS AND SKILL MAKE A COMPLETE PLAYER", "Longevity", "THE SECRET TO LONGEVITY IS LOVING WHAT YOU DO EVERY DAY"],
  ["John Stockton", "Teamwork", "PASS FIRST ALWAYS", "Legacy", "THE ASSIST MATTERS MORE THAN THE SCORE", "Fundamentals", "MASTER THE BASICS AND EVERYTHING ELSE WILL FOLLOW"],
  ["Kevin Garnett", "Intensity", "ANYTHING IS POSSIBLE", "Legacy", "LEAVE IT ALL ON THE FLOOR EVERY NIGHT", "Defense", "DEFENSE WINS CHAMPIONSHIPS AND CHAMPIONSHIPS DEFINE LEGACIES"],
  ["Luka Doncic", "Magic", "MAKE THE MAGIC HAPPEN", "Compete", "I LIVE TO COMPETE AND I COMPETE TO WIN", "Youth", "AGE IS JUST A NUMBER WHEN YOU HAVE THE SKILL AND THE WILL"],
  ["Nikola Jokic", "Fun", "HAVE FUN OUT THERE", "Calm", "STAY CALM AND MAKE THE RIGHT PLAY", "Team", "BASKETBALL IS A TEAM SPORT AND THE TEAM ALWAYS COMES FIRST"],
  ["Ray Allen", "Routine", "TRUST YOUR ROUTINE", "Shooting", "PERFECT PRACTICE MAKES PERFECT SHOTS", "Preparation", "I SHOOT A THOUSAND SHOTS SO THE ONE THAT MATTERS FEELS EASY"],
  ["Alexander Ovechkin", "Score Goals", "I LOVE TO SCORE", "Passion", "HOCKEY IS TRULY MY WHOLE LIFE", "Cup", "I CAME HERE TO WIN THE CUP AND BRING IT HOME TO MY TEAM"],
  ["Diego Maradona", "Passion", "PLAY WITH PASSION", "Dream", "FOOTBALL WAS MY ONLY DREAM AS A BOY", "Heart", "I GAVE EVERYTHING ON THE PITCH EACH AND EVERY TIME I PLAYED"],
  ["Cristiano Ronaldo", "Believe", "I BELIEVE IN ME", "Win", "WINNING IS A HABIT NOT AN ACCIDENT", "Drive", "MY DRIVE COMES FROM WANTING TO BE THE GREATEST PLAYER EVER"],
  ["Zinedine Zidane", "Simple", "KEEP IT VERY SIMPLE", "Ball", "THE BALL KNOWS WHERE TO GO", "Passion", "HARD WORK AND PASSION FOR THE GAME TOOK ME TO THE TOP"],
  ["Johan Cruyff", "Brain", "FOOTBALL IS A BRAIN GAME", "Quality", "QUALITY WITHOUT RESULTS IS POINTLESS", "Space", "IF YOU HAVE THE BALL YOU MUST MAKE THE FIELD AS BIG AS YOU CAN"],
  ["Franz Beckenbauer", "Pride", "DEFEND WITH PRIDE", "Complete", "A DEFENDER WHO CAN ATTACK IS TRULY COMPLETE", "Belief", "TO WIN YOU MUST BELIEVE IN YOURSELF AND YOUR TEAM ABOVE ALL"],
  ["Megan Rapinoe", "Brave", "WE MUST BE SO BRAVE", "Voice", "USE YOUR VOICE FOR CHANGE", "Inspire", "MY GOAL IS TO INSPIRE OTHERS AND FIGHT FOR A MORE JUST WORLD"],
  ["Brandi Chastain", "Moment", "LIVE IN THE MOMENT", "Heart", "PUT YOUR HEART INTO EVERY GAME", "Joy", "THE JOY OF WINNING COMES FROM THE PAIN OF SACRIFICE"],
  ["Gary Player", "Shots", "EVERY SHOT COUNTS", "Luck", "THE HARDER I WORK THE LUCKIER I GET", "Hazards", "OF ALL THE HAZARDS ON A GOLF COURSE FEAR IS THE WORST ONE BY FAR"],
  ["Ben Hogan", "Dig", "I DIG IT OUT", "Ground", "I DIG MY GAME OUT OF THE GROUND", "Discipline", "THE ONLY THING A GOLFER NEEDS IS MORE DAYLIGHT TO PRACTICE"],
  ["Bobby Jones", "Study", "STUDY THE GAME", "Compete", "YOU COMPETE AGAINST YOURSELF", "Par", "FORGET YOUR OPPONENTS ALWAYS PLAY AGAINST OLD MAN PAR"],
  ["Sam Snead", "Easy", "SWING WITH EASE NOW", "Practice", "PRACTICE PUTS YOUR BRAINS IN YOUR MUSCLES", "Relax", "IF YOU WORRY ABOUT MAKING BOGEYS IT MAKES YOU TENSE"],
  ["Lee Trevino", "Fun", "KEEP IT SIMPLE", "Practice", "THE MORE I PRACTICE THE LUCKIER I GET", "Lightning", "IF YOU ARE CAUGHT ON A GOLF COURSE DURING A STORM HOLD UP YOUR ONE IRON"],
  ["Chi Chi Rodriguez", "Heart", "GOLF IS MY WHOLE WORLD", "Joy", "I PLAY FOR THE LOVE OF THE GAME", "Spirit", "GIVING BACK TO OTHERS IS THE GREATEST JOY IN ALL OF LIFE"],
  ["Nancy Lopez", "Believe", "BELIEVE IN YOUR SWING", "Drive", "DRIVE FORWARD WITH ALL YOUR HEART", "Win", "A WINNER IS A DREAMER WHO NEVER GIVES UP ON HER GOALS"],
  ["Annika Sorenstam", "Practice", "TRAIN WITH PURPOSE", "Focus", "FOCUS ON WHAT YOU CAN CONTROL", "Prepared", "I PREPARE TO WIN BECAUSE I WORK HARDER THAN ANYONE ELSE"],
  ["Roger Federer", "Grace", "PLAY WITH GRACE AND CALM", "Joy", "FIND YOUR JOY ON THE COURT", "Belief", "YOU MUST BELIEVE IN YOURSELF WHEN NOBODY ELSE DOES"],
  ["Pete Sampras", "Serve", "A GREAT SERVE WINS", "Quiet", "LET YOUR RACKET DO THE TALKING", "Champion", "CHAMPIONS FIND A WAY TO WIN EVERY SINGLE TIME THEY PLAY"],
  ["John McEnroe", "Serious", "YOU CANNOT BE SERIOUS", "Compete", "I HATE TO LOSE MORE THAN I LOVE TO WIN A MATCH", "Passion", "PASSION DRIVES EVERYTHING I DO ON THE TENNIS COURT"],
  ["Jimmy Connors", "Fight", "I LOVE A GOOD FIGHT", "Guts", "PLAY WITH GUTS AND HEART EVERY MATCH", "Retire", "I NEVER WANTED TO RETIRE BECAUSE I LOVED THE GAME SO VERY MUCH"],
  ["Chris Evert", "Win", "WIN WITH POISE", "Cool", "STAY COOL UNDER PRESSURE", "Mental", "THE MENTAL SIDE OF TENNIS IS WHAT SEPARATES THE BEST FROM THE REST"],
  ["Steffi Graf", "Move", "FOOTWORK WINS POINTS", "Simple", "KEEP YOUR GAME SIMPLE AND PLAY TO YOUR STRENGTHS", "Drive", "MY FOREHAND WAS ALWAYS MY GREATEST WEAPON ON COURT"],
  ["Monica Seles", "Power", "HIT WITH FULL POWER", "Early", "START STRONG AND STAY STRONG", "Fight", "NEVER GIVE UP NO MATTER WHAT HAPPENS TO YOU IN LIFE OR SPORT"],
  ["Maria Sharapova", "Strong", "STRONG MIND STRONG BODY", "Compete", "I WAS BORN TO COMPETE AND WIN ON THE BIGGEST STAGE", "Desire", "MY DESIRE TO WIN IS WHAT DRIVES ME FORWARD EVERY DAY"],
  ["Naomi Osaka", "Story", "OWN YOUR STORY", "Strength", "YOUR MIND IS YOUR GREATEST STRENGTH", "Voice", "SPEAK UP FOR WHAT YOU BELIEVE IN AND NEVER BE AFRAID"],
  ["Apolo Ohno", "Speed", "SPEED WINS", "Control", "SPEED IS NOTHING WITHOUT CONTROL", "Race", "EVERY RACE IS A CHANCE TO PROVE WHAT YOU ARE MADE FOR"],
  ["Mikaela Shiffrin", "Precise", "PRECISION WINS RACES", "Turns", "EVERY TURN IS A NEW CHANCE", "Commit", "COMMIT TO THE PROCESS AND TRUST YOUR TRAINING PLAN"],
  ["Red Gerard", "Send", "SEND IT NOW", "Drop", "DROP IN AND GIVE IT EVERYTHING YOU HAVE", "Limits", "PUSH YOUR LIMITS EVERY SINGLE DAY AND SEE WHAT HAPPENS NEXT"],
  ["Nathan Chen", "Quad", "LAND IT NOW", "Alive", "THE ICE IS WHERE I FEEL MOST ALIVE", "Relentless", "BE RELENTLESS IN YOUR PURSUIT OF EXCELLENCE ON THE ICE"],
  ["Kristi Yamaguchi", "Dream", "JUST DREAM", "Glide", "GLIDE WITH PURPOSE AND HEART", "Faith", "TRUST YOUR HARD WORK AND BELIEVE IN WHO YOU HAVE BECOME"],
  ["Dorothy Hamill", "Spin", "JUST KEEP SPINNING", "Joy", "SKATING ALWAYS BRINGS ME SUCH JOY", "Courage", "HAVE COURAGE AND STEP ONTO THE ICE EVEN WHEN AFRAID"],
  ["Scott Hamilton", "Finish", "ALWAYS FINISH STRONG", "Attitude", "A GREAT ATTITUDE WINS EVERY TIME", "Strength", "RISE AFTER EVERY FALL AND PROVE WHAT YOU ARE MADE OF"],
  ["Brian Boitano", "Jump", "JUST JUMP HIGH", "Land", "LAND EVERY JUMP WITH TOTAL CONFIDENCE", "Compete", "COMPETE WITH HONOR AND LEAVE EVERYTHING ON THE ICE"],
  ["Harriet Beecher Stowe", "Morning Hymn", "STILL STILL WITH THEE", "Offered Grace", "A DAY OF GRACE IS YET HELD OUT TO US", "Deep Feeling", "ANY MIND THAT IS CAPABLE OF A REAL SORROW IS CAPABLE OF GOOD"],
  ["Kurt Vonnegut", "Cosmic Busy", "BUSY BUSY BUSY", "New Arrival", "HELLO BABIES WELCOME TO EARTH", "Humane Ideas", "WE ARE HEALTHY ONLY TO THE EXTENT THAT OUR IDEAS ARE HUMANE"],
  ["Epicurus", "DO NOT", "DO NOT A ALL", "NOT WHAT", "NOT WHAT WE HAVE BUT WHAT WE ENJOY IS OUR", "THE ART", "THE ART OF LIVING WELL AND THE ART OF DYING WELL ARE ONE AND THE SAME ART IN TRUTH"],
  ["Thucydides", "THE SECRET", "THE SECRET", "THE NATION", "THE NATION THAT DRAWS A BE", "THE SECRET", "THE SECRET OF HAPPINESS IS FREEDOM AND THE SECRET A"],
  ["Plutarch", "THE MIND", "THE MIND IS NOT", "WHAT WE", "WHAT WE ACHIEVE INWARDLY WILL CHANGE OUTER", "THE MIND", "THE MIND IS NOT A VESSEL TO BE FILLED BUT A FIRE TO BE A"],
  ["Ovid", "LOVE CONQUERS", "LOVE CONQUERS ALL", "DRIPPING WATER", "DRIPPING WATER HOLLOWS A", "HAPPY IS", "HAPPY IS THE MAN WHO HAS BROKEN THE CHAINS WHICH ALL"],
  ["Virgil", "LOVE CONQUERS", "LOVE CONQUERS", "FORTUNE FAVORS", "FORTUNE FAVORS THE BOLD AND THE BRAVE SOUL", "EACH OF", "EACH OF US BEARS HIS OWN HELL AND WE MUST FIND THE WAY"],
  ["Horace", "SEIZE THE", "SEIZE THE A", "HE WHO", "HE WHO HAS BEGUN HAS HALF A", "WHATEVER ADVICE", "WHATEVER ADVICE YOU GIVE BE SHORT AND TO THE POINT A"],
  ["Cicero", "A ROOM", "A ROOM WITHOUT", "IF YOU", "IF YOU HAVE A GARDEN AND A A", "THE LIFE", "THE LIFE GIVEN US BY NATURE IS SHORT BUT THE MEMORY A"],
  ["Juvenal", "A HEALTHY", "A HEALTHY MIND", "A HEALTHY", "A HEALTHY MIND IN A ALL ALL", "NEVER DOES", "NEVER DOES NATURE SAY ONE THING AND WISDOM ANOTHER"],
  ["Tacitus", "THE DESIRE", "THE DESIRE FOR", "THE MORE", "THE MORE CORRUPT THE STATE THE MORE LAWS IT", "REASON AND", "REASON AND JUDGMENT ARE THE QUALITIES OF A LEADER A"],
  ["Sallust", "FEW MEN", "FEW MEN DESIRE", "EVERY MAN", "EVERY MAN IS THE ARCHITECT OF", "FEW MEN", "FEW MEN DESIRE LIBERTY MOST MEN WISH ONLY FOR A JUST"],
  ["Lucretius", "DROPS OF", "DROPS OF BE", "CONSTANT DRIPPING", "CONSTANT DRIPPING BE ALL", "THE DROPS", "THE DROPS OF RAIN MAKE A HOLE IN THE STONE NOT BY A ALL"],
  ["Terence", "I AM", "I AM A MAN BE", "FORTUNE FAVORS", "FORTUNE FAVORS THE BRAVE AND BOLD IN SPIRIT", "I AM", "I AM A HUMAN BEING AND I CONSIDER NOTHING THAT IS HUMAN TO BE ALIEN TO MY OWN SOUL"],
  ["Livy", "BETTER LATE", "BETTER LATE BE", "WE CAN", "WE CAN ENDURE NEITHER OUR", "THE STUDY", "THE STUDY OF HISTORY IS THE BEST MEDICINE FOR A SICK"],
  ["Diogenes", "I AM", "I AM LOOKING BE", "IT IS", "IT IS THE PRIVILEGE OF THE", "THE SUN", "THE SUN TOO SHINES INTO CESSPOOLS AND IS NOT POLLUTED A"],
  ["Pythagoras", "DO NOT", "DO NOT SAY A", "THERE IS", "THERE IS GEOMETRY IN THE HUMMING OF STRINGS", "AS LONG", "AS LONG AS MAN CONTINUES TO BE THE RUTHLESS DESTROYER A"],
];

const DIFFICULTY_OFFSET: Record<string, number> = { easy: 1, medium: 3, hard: 5 };

export function getPuzzlePool(difficulty: string): PuzzleDef[] {
  const off = DIFFICULTY_OFFSET[difficulty] ?? 1;
  const diff = (difficulty as Difficulty) ?? "easy";
  return AUTHORS.map((a, i) => {
    const prefix = diff[0];
    const id = `${prefix}${String(i + 1).padStart(3, "0")}`;
    const rand = seededRandom(`serpentine:layout:${id}`);
    return expand(a[off], a[off + 1], id, diff, rand);
  });
}

export function getPuzzle(difficulty: string, index: number): PuzzleDef {
  const off = DIFFICULTY_OFFSET[difficulty] ?? 1;
  const diff = (difficulty as Difficulty) ?? "easy";
  const i = index % AUTHORS.length;
  const a = AUTHORS[i];
  const prefix = diff[0];
  const id = `${prefix}${String(i + 1).padStart(3, "0")}`;
  const rand = seededRandom(`serpentine:layout:${id}`);
  return expand(a[off], a[off + 1], id, diff, rand);
}

export function getAuthorForDay(index: number): string {
  return AUTHORS[index % AUTHORS.length][0];
}

export function getPoolSize(): number {
  return AUTHORS.length;
}
