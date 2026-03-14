/**
 * demo-puzzles.js — Branching puzzles for testing without Gemini API
 *
 * Flat graph with `next` indices. Green options advance the main path.
 * Yellow options route to detour steps that rejoin the main path.
 * `next: null` means the option IS the target — triggers auto-complete.
 *
 * optimalLength = number of main-path steps (green picks only).
 */

const DEMO_PUZZLES = [

  // ── Puzzle 1 (5 main steps): Tom Hanks → Rihanna ─────────────
  {
    start: {
      name: "Tom Hanks",
      descriptor: "American actor",
      wikiTitle: "Tom Hanks",
      photoUrl: null,
    },
    target: {
      name: "Rihanna",
      descriptor: "Barbadian singer",
      wikiTitle: "Rihanna",
      photoUrl: null,
    },
    optimalLength: 5,
    steps: [
      // 0 — main: from Tom Hanks
      {
        from: "Tom Hanks",
        main: true,
        options: [
          { name: "Steven Spielberg", descriptor: "American filmmaker", wikiTitle: "Steven Spielberg", color: "green", relationship: "Directed Saving Private Ryan", next: 1 },
          { name: "Meg Ryan", descriptor: "American actress", wikiTitle: "Meg Ryan", color: "yellow", relationship: "Co-starred in Sleepless in Seattle", next: 5 },
          { name: "Robin Wright", descriptor: "American actress", wikiTitle: "Robin Wright", color: "yellow", relationship: "Co-starred in Forrest Gump", next: 6 },
          { name: "Tim Allen", descriptor: "American actor", wikiTitle: "Tim Allen", color: "yellow", relationship: "Voiced Toy Story together", next: 7 },
        ],
      },
      // 1 — main: from Spielberg
      {
        from: "Steven Spielberg",
        main: true,
        options: [
          { name: "Oprah Winfrey", descriptor: "American media mogul", wikiTitle: "Oprah Winfrey", color: "green", relationship: "Directed her in The Color Purple", next: 2 },
          { name: "George Lucas", descriptor: "American filmmaker", wikiTitle: "George Lucas", color: "yellow", relationship: "Created Indiana Jones together", next: 8 },
          { name: "Harrison Ford", descriptor: "American actor", wikiTitle: "Harrison Ford", color: "yellow", relationship: "Directed him in four films", next: 9 },
          { name: "Liam Neeson", descriptor: "Irish actor", wikiTitle: "Liam Neeson", color: "yellow", relationship: "Directed him in Schindler's List", next: 10 },
        ],
      },
      // 2 — main: from Oprah
      {
        from: "Oprah Winfrey",
        main: true,
        options: [
          { name: "Jay-Z", descriptor: "American rapper", wikiTitle: "Jay-Z", color: "green", relationship: "Interviewed him on her show", next: 3 },
          { name: "Barack Obama", descriptor: "44th US President", wikiTitle: "Barack Obama", color: "yellow", relationship: "Campaigned for him in 2008", next: 11 },
          { name: "Dr. Phil", descriptor: "TV personality", wikiTitle: "Phil McGraw", color: "yellow", relationship: "Launched his TV career", next: 12 },
          { name: "Gayle King", descriptor: "TV journalist", wikiTitle: "Gayle King", color: "yellow", relationship: "Best friends for 40+ years", next: 13 },
        ],
      },
      // 3 — main: from Jay-Z
      {
        from: "Jay-Z",
        main: true,
        options: [
          { name: "Kanye West", descriptor: "American rapper", wikiTitle: "Kanye West", color: "green", relationship: "Made Watch the Throne together", next: 4 },
          { name: "Beyoncé", descriptor: "American singer", wikiTitle: "Beyoncé", color: "yellow", relationship: "Married since 2008", next: 14 },
          { name: "Nas", descriptor: "American rapper", wikiTitle: "Nas", color: "yellow", relationship: "Famous rap rivalry turned peace", next: 15 },
          { name: "Diddy", descriptor: "American rapper", wikiTitle: "Sean Combs", color: "yellow", relationship: "Co-headlined tours together", next: 16 },
        ],
      },
      // 4 — main: from Kanye (final — green → target)
      {
        from: "Kanye West",
        main: true,
        options: [
          { name: "Rihanna", descriptor: "Barbadian singer", wikiTitle: "Rihanna", color: "green", relationship: "Collaborated on multiple hits", next: null },
          { name: "Kim Kardashian", descriptor: "Media personality", wikiTitle: "Kim Kardashian", color: "yellow", relationship: "Married 2014–2022", next: 17 },
          { name: "Travis Scott", descriptor: "American rapper", wikiTitle: "Travis Scott", color: "yellow", relationship: "Protégé and collaborator", next: 18 },
          { name: "Pharrell", descriptor: "American musician", wikiTitle: "Pharrell Williams", color: "yellow", relationship: "Produced tracks together", next: 19 },
        ],
      },

      // ── Detour steps ──────────────────────────────────────────

      // 5 — detour: from Meg Ryan → rejoin at step 1
      {
        from: "Meg Ryan",
        main: false,
        options: [
          { name: "Steven Spielberg", descriptor: "American filmmaker", wikiTitle: "Steven Spielberg", color: "green", relationship: "Both Amblin Entertainment icons", next: 1 },
          { name: "Billy Crystal", descriptor: "American comedian", wikiTitle: "Billy Crystal", color: "yellow", relationship: "Co-starred in When Harry Met Sally", next: 1 },
          { name: "Dennis Quaid", descriptor: "American actor", wikiTitle: "Dennis Quaid", color: "yellow", relationship: "Were married 1991–2001", next: 1 },
          { name: "Nora Ephron", descriptor: "American filmmaker", wikiTitle: "Nora Ephron", color: "yellow", relationship: "Directed her three times", next: 1 },
        ],
      },
      // 6 — detour: from Robin Wright → rejoin at step 1
      {
        from: "Robin Wright",
        main: false,
        options: [
          { name: "Steven Spielberg", descriptor: "American filmmaker", wikiTitle: "Steven Spielberg", color: "green", relationship: "He produced Forrest Gump", next: 1 },
          { name: "Sean Penn", descriptor: "American actor", wikiTitle: "Sean Penn", color: "yellow", relationship: "Were married 1996–2010", next: 1 },
          { name: "Kevin Spacey", descriptor: "American actor", wikiTitle: "Kevin Spacey", color: "yellow", relationship: "Co-starred in House of Cards", next: 1 },
          { name: "Ben Foster", descriptor: "American actor", wikiTitle: "Ben Foster", color: "yellow", relationship: "Were engaged 2014–2015", next: 1 },
        ],
      },
      // 7 — detour: from Tim Allen → rejoin at step 1
      {
        from: "Tim Allen",
        main: false,
        options: [
          { name: "Steven Spielberg", descriptor: "American filmmaker", wikiTitle: "Steven Spielberg", color: "green", relationship: "Both icons of 90s blockbusters", next: 1 },
          { name: "Jonathan Taylor Thomas", descriptor: "American actor", wikiTitle: "Jonathan Taylor Thomas", color: "yellow", relationship: "TV father-son on Home Improvement", next: 1 },
          { name: "Martin Short", descriptor: "Canadian actor", wikiTitle: "Martin Short", color: "yellow", relationship: "Co-starred in Santa Clause 3", next: 1 },
          { name: "Pamela Anderson", descriptor: "Canadian actress", wikiTitle: "Pamela Anderson", color: "yellow", relationship: "Both on Home Improvement", next: 1 },
        ],
      },
      // 8 — detour: from George Lucas → rejoin at step 2
      {
        from: "George Lucas",
        main: false,
        options: [
          { name: "Oprah Winfrey", descriptor: "American media mogul", wikiTitle: "Oprah Winfrey", color: "green", relationship: "Close friends for decades", next: 2 },
          { name: "Mark Hamill", descriptor: "American actor", wikiTitle: "Mark Hamill", color: "yellow", relationship: "Cast him as Luke Skywalker", next: 2 },
          { name: "Francis Ford Coppola", descriptor: "American filmmaker", wikiTitle: "Francis Ford Coppola", color: "yellow", relationship: "USC film school classmates", next: 2 },
          { name: "Natalie Portman", descriptor: "Israeli-American actress", wikiTitle: "Natalie Portman", color: "yellow", relationship: "Cast her as Padmé Amidala", next: 2 },
        ],
      },
      // 9 — detour: from Harrison Ford → rejoin at step 2
      {
        from: "Harrison Ford",
        main: false,
        options: [
          { name: "Oprah Winfrey", descriptor: "American media mogul", wikiTitle: "Oprah Winfrey", color: "green", relationship: "Memorable interview on her show", next: 2 },
          { name: "Calista Flockhart", descriptor: "American actress", wikiTitle: "Calista Flockhart", color: "yellow", relationship: "Married since 2010", next: 2 },
          { name: "Carrie Fisher", descriptor: "American actress", wikiTitle: "Carrie Fisher", color: "yellow", relationship: "Co-starred in Star Wars", next: 2 },
          { name: "Sean Connery", descriptor: "Scottish actor", wikiTitle: "Sean Connery", color: "yellow", relationship: "Co-starred in Last Crusade", next: 2 },
        ],
      },
      // 10 — detour: from Liam Neeson → rejoin at step 2
      {
        from: "Liam Neeson",
        main: false,
        options: [
          { name: "Oprah Winfrey", descriptor: "American media mogul", wikiTitle: "Oprah Winfrey", color: "green", relationship: "Emotional interview on her show", next: 2 },
          { name: "Ralph Fiennes", descriptor: "English actor", wikiTitle: "Ralph Fiennes", color: "yellow", relationship: "Co-starred in Schindler's List", next: 2 },
          { name: "Natasha Richardson", descriptor: "English actress", wikiTitle: "Natasha Richardson", color: "yellow", relationship: "Were married 1994–2009", next: 2 },
          { name: "Ewan McGregor", descriptor: "Scottish actor", wikiTitle: "Ewan McGregor", color: "yellow", relationship: "Both in Star Wars prequels", next: 2 },
        ],
      },
      // 11 — detour: from Obama → rejoin at step 3
      {
        from: "Barack Obama",
        main: false,
        options: [
          { name: "Jay-Z", descriptor: "American rapper", wikiTitle: "Jay-Z", color: "green", relationship: "Performed at his inauguration", next: 3 },
          { name: "Michelle Obama", descriptor: "Former First Lady", wikiTitle: "Michelle Obama", color: "yellow", relationship: "Married since 1992", next: 3 },
          { name: "Joe Biden", descriptor: "46th US President", wikiTitle: "Joe Biden", color: "yellow", relationship: "VP for eight years", next: 3 },
          { name: "Bruce Springsteen", descriptor: "American musician", wikiTitle: "Bruce Springsteen", color: "yellow", relationship: "Campaigned together on tour", next: 3 },
        ],
      },
      // 12 — detour: from Dr. Phil → rejoin at step 3
      {
        from: "Dr. Phil",
        main: false,
        options: [
          { name: "Jay-Z", descriptor: "American rapper", wikiTitle: "Jay-Z", color: "green", relationship: "Both daytime TV fixtures", next: 3 },
          { name: "Robin McGraw", descriptor: "TV personality", wikiTitle: "Robin McGraw", color: "yellow", relationship: "Married since 1976", next: 3 },
          { name: "Steve Harvey", descriptor: "TV host", wikiTitle: "Steve Harvey", color: "yellow", relationship: "Fellow daytime TV hosts", next: 3 },
          { name: "Britney Spears", descriptor: "American singer", wikiTitle: "Britney Spears", color: "yellow", relationship: "Controversial intervention episode", next: 3 },
        ],
      },
      // 13 — detour: from Gayle King → rejoin at step 3
      {
        from: "Gayle King",
        main: false,
        options: [
          { name: "Jay-Z", descriptor: "American rapper", wikiTitle: "Jay-Z", color: "green", relationship: "Interviewed him on CBS", next: 3 },
          { name: "Norah O'Donnell", descriptor: "TV journalist", wikiTitle: "Norah O'Donnell", color: "yellow", relationship: "Co-anchored CBS Mornings", next: 3 },
          { name: "Cory Booker", descriptor: "US Senator", wikiTitle: "Cory Booker", color: "yellow", relationship: "Longtime friends", next: 3 },
          { name: "Diana Ross", descriptor: "American singer", wikiTitle: "Diana Ross", color: "yellow", relationship: "Friends and interview subject", next: 3 },
        ],
      },
      // 14 — detour: from Beyoncé → rejoin at step 4
      {
        from: "Beyoncé",
        main: false,
        options: [
          { name: "Kanye West", descriptor: "American rapper", wikiTitle: "Kanye West", color: "green", relationship: "VMAs incident brought them together", next: 4 },
          { name: "Kelly Rowland", descriptor: "American singer", wikiTitle: "Kelly Rowland", color: "yellow", relationship: "Destiny's Child together", next: 4 },
          { name: "Adele", descriptor: "English singer", wikiTitle: "Adele", color: "yellow", relationship: "Mutual admiration at Grammys", next: 4 },
          { name: "Blue Ivy Carter", descriptor: "Daughter", wikiTitle: "Blue Ivy Carter", color: "yellow", relationship: "Mother and daughter", next: 4 },
        ],
      },
      // 15 — detour: from Nas → rejoin at step 4
      {
        from: "Nas",
        main: false,
        options: [
          { name: "Kanye West", descriptor: "American rapper", wikiTitle: "Kanye West", color: "green", relationship: "Kanye produced his album", next: 4 },
          { name: "Kelis", descriptor: "American singer", wikiTitle: "Kelis", color: "yellow", relationship: "Were married 2005–2010", next: 4 },
          { name: "Lauryn Hill", descriptor: "American singer", wikiTitle: "Lauryn Hill", color: "yellow", relationship: "Collaborated on If I Ruled the World", next: 4 },
          { name: "DMX", descriptor: "American rapper", wikiTitle: "DMX", color: "yellow", relationship: "Belly co-stars and rap peers", next: 4 },
        ],
      },
      // 16 — detour: from Diddy → rejoin at step 4
      {
        from: "Diddy",
        main: false,
        options: [
          { name: "Kanye West", descriptor: "American rapper", wikiTitle: "Kanye West", color: "green", relationship: "Hip-hop mogul peers", next: 4 },
          { name: "The Notorious B.I.G.", descriptor: "American rapper", wikiTitle: "The Notorious B.I.G.", color: "yellow", relationship: "Discovered and signed him", next: 4 },
          { name: "Jennifer Lopez", descriptor: "American entertainer", wikiTitle: "Jennifer Lopez", color: "yellow", relationship: "Dated 1999–2001", next: 4 },
          { name: "Cassie", descriptor: "American singer", wikiTitle: "Cassie Ventura", color: "yellow", relationship: "Were in a relationship", next: 4 },
        ],
      },
      // 17 — detour: from Kim K → rejoin to final (target auto-complete)
      {
        from: "Kim Kardashian",
        main: false,
        options: [
          { name: "Rihanna", descriptor: "Barbadian singer", wikiTitle: "Rihanna", color: "green", relationship: "Close friends in fashion world", next: null },
          { name: "Paris Hilton", descriptor: "Media personality", wikiTitle: "Paris Hilton", color: "yellow", relationship: "Was her assistant pre-fame", next: null },
          { name: "Pete Davidson", descriptor: "American comedian", wikiTitle: "Pete Davidson", color: "yellow", relationship: "Dated 2021–2022", next: null },
          { name: "Khloé Kardashian", descriptor: "Media personality", wikiTitle: "Khloé Kardashian", color: "yellow", relationship: "Sisters", next: null },
        ],
      },
      // 18 — detour: from Travis Scott → rejoin to final
      {
        from: "Travis Scott",
        main: false,
        options: [
          { name: "Rihanna", descriptor: "Barbadian singer", wikiTitle: "Rihanna", color: "green", relationship: "Both Cactus Jack affiliates", next: null },
          { name: "Kylie Jenner", descriptor: "Media personality", wikiTitle: "Kylie Jenner", color: "yellow", relationship: "Have two children together", next: null },
          { name: "Drake", descriptor: "Canadian rapper", wikiTitle: "Drake", color: "yellow", relationship: "Collaborated on SICKO MODE", next: null },
          { name: "Kid Cudi", descriptor: "American rapper", wikiTitle: "Kid Cudi", color: "yellow", relationship: "Both Kanye protégés", next: null },
        ],
      },
      // 19 — detour: from Pharrell → rejoin to final
      {
        from: "Pharrell",
        main: false,
        options: [
          { name: "Rihanna", descriptor: "Barbadian singer", wikiTitle: "Rihanna", color: "green", relationship: "Produced many of her hits", next: null },
          { name: "Chad Hugo", descriptor: "American musician", wikiTitle: "Chad Hugo", color: "yellow", relationship: "The Neptunes duo together", next: null },
          { name: "Gwen Stefani", descriptor: "American singer", wikiTitle: "Gwen Stefani", color: "yellow", relationship: "Produced Hollaback Girl", next: null },
          { name: "Daft Punk", descriptor: "French duo", wikiTitle: "Daft Punk", color: "yellow", relationship: "Made Get Lucky together", next: null },
        ],
      },
    ],
  },

  // ── Puzzle 2 (6 main steps): Elon Musk → Adele ───────────────
  {
    start: {
      name: "Elon Musk",
      descriptor: "Tech entrepreneur",
      wikiTitle: "Elon Musk",
      photoUrl: null,
    },
    target: {
      name: "Adele",
      descriptor: "English singer",
      wikiTitle: "Adele",
      photoUrl: null,
    },
    optimalLength: 6,
    steps: [
      // 0 — main: from Elon Musk
      {
        from: "Elon Musk",
        main: true,
        options: [
          { name: "Kanye West", descriptor: "American rapper", wikiTitle: "Kanye West", color: "green", relationship: "Public friendship since 2015", next: 1 },
          { name: "Joe Rogan", descriptor: "American podcaster", wikiTitle: "Joe Rogan", color: "yellow", relationship: "Famous podcast appearance", next: 7 },
          { name: "Grimes", descriptor: "Canadian musician", wikiTitle: "Grimes (musician)", color: "yellow", relationship: "Former partner, share children", next: 8 },
          { name: "Jeff Bezos", descriptor: "Amazon founder", wikiTitle: "Jeff Bezos", color: "yellow", relationship: "Billionaire space race rivals", next: 9 },
        ],
      },
      // 1 — main: from Kanye
      {
        from: "Kanye West",
        main: true,
        options: [
          { name: "Kim Kardashian", descriptor: "Media personality", wikiTitle: "Kim Kardashian", color: "green", relationship: "Married 2014–2022", next: 2 },
          { name: "Jay-Z", descriptor: "American rapper", wikiTitle: "Jay-Z", color: "yellow", relationship: "Made Watch the Throne together", next: 10 },
          { name: "Pusha T", descriptor: "American rapper", wikiTitle: "Pusha T", color: "yellow", relationship: "Signed to his GOOD Music label", next: 11 },
          { name: "Virgil Abloh", descriptor: "Fashion designer", wikiTitle: "Virgil Abloh", color: "yellow", relationship: "Interned at Fendi together", next: 12 },
        ],
      },
      // 2 — main: from Kim K
      {
        from: "Kim Kardashian",
        main: true,
        options: [
          { name: "Pete Davidson", descriptor: "American comedian", wikiTitle: "Pete Davidson", color: "green", relationship: "Dated 2021–2022", next: 3 },
          { name: "Paris Hilton", descriptor: "Media personality", wikiTitle: "Paris Hilton", color: "yellow", relationship: "Was her assistant pre-fame", next: 13 },
          { name: "Kris Jenner", descriptor: "TV personality", wikiTitle: "Kris Jenner", color: "yellow", relationship: "Mother and manager", next: 14 },
          { name: "Jonathan Cheban", descriptor: "TV personality", wikiTitle: "Jonathan Cheban", color: "yellow", relationship: "Best friend, on KUWTK", next: 15 },
        ],
      },
      // 3 — main: from Pete Davidson
      {
        from: "Pete Davidson",
        main: true,
        options: [
          { name: "Ariana Grande", descriptor: "American singer", wikiTitle: "Ariana Grande", color: "green", relationship: "Engaged in 2018", next: 4 },
          { name: "John Mulaney", descriptor: "American comedian", wikiTitle: "John Mulaney", color: "yellow", relationship: "SNL writing partners", next: 16 },
          { name: "Machine Gun Kelly", descriptor: "American rapper", wikiTitle: "Machine Gun Kelly", color: "yellow", relationship: "Close friends and co-stars", next: 17 },
          { name: "Colin Jost", descriptor: "American comedian", wikiTitle: "Colin Jost", color: "yellow", relationship: "SNL castmates", next: 18 },
        ],
      },
      // 4 — main: from Ariana Grande
      {
        from: "Ariana Grande",
        main: true,
        options: [
          { name: "Ed Sheeran", descriptor: "English singer", wikiTitle: "Ed Sheeran", color: "green", relationship: "Both on same record label", next: 5 },
          { name: "Nicki Minaj", descriptor: "Trinidadian rapper", wikiTitle: "Nicki Minaj", color: "yellow", relationship: "Collaborated on Side to Side", next: 19 },
          { name: "Dalton Gomez", descriptor: "Real estate agent", wikiTitle: "Dalton Gomez", color: "yellow", relationship: "Were married 2021–2024", next: 20 },
          { name: "Ethan Slater", descriptor: "American actor", wikiTitle: "Ethan Slater", color: "yellow", relationship: "Met on Wicked set", next: 21 },
        ],
      },
      // 5 — main: from Ed Sheeran (final — green → target)
      {
        from: "Ed Sheeran",
        main: true,
        options: [
          { name: "Adele", descriptor: "English singer", wikiTitle: "Adele", color: "green", relationship: "Close friends, both from England", next: null },
          { name: "Taylor Swift", descriptor: "American singer", wikiTitle: "Taylor Swift", color: "yellow", relationship: "Collaborated on Everything Has Changed", next: 22 },
          { name: "Elton John", descriptor: "English musician", wikiTitle: "Elton John", color: "yellow", relationship: "Elton mentored him early on", next: 23 },
          { name: "Stormzy", descriptor: "English rapper", wikiTitle: "Stormzy", color: "yellow", relationship: "Collaborated on Take Me Back to London", next: 24 },
        ],
      },
      // 6 — (unused index, kept for alignment)

      // ── Detour steps ──────────────────────────────────────────

      // 7 — detour: from Joe Rogan → rejoin at step 1
      {
        from: "Joe Rogan",
        main: false,
        options: [
          { name: "Kanye West", descriptor: "American rapper", wikiTitle: "Kanye West", color: "green", relationship: "3-hour podcast interview", next: 1 },
          { name: "Alex Jones", descriptor: "Media personality", wikiTitle: "Alex Jones", color: "yellow", relationship: "Controversial podcast guest", next: 1 },
          { name: "Dana White", descriptor: "UFC president", wikiTitle: "Dana White", color: "yellow", relationship: "UFC commentary together", next: 1 },
          { name: "Neil deGrasse Tyson", descriptor: "Astrophysicist", wikiTitle: "Neil deGrasse Tyson", color: "yellow", relationship: "Science podcast episodes", next: 1 },
        ],
      },
      // 8 — detour: from Grimes → rejoin at step 1
      {
        from: "Grimes",
        main: false,
        options: [
          { name: "Kanye West", descriptor: "American rapper", wikiTitle: "Kanye West", color: "green", relationship: "Both experimental artists", next: 1 },
          { name: "Hana Pestle", descriptor: "American musician", wikiTitle: "Hana (musician)", color: "yellow", relationship: "Musical collaborator", next: 1 },
          { name: "Poppy", descriptor: "American singer", wikiTitle: "Poppy (entertainer)", color: "yellow", relationship: "Both avant-garde pop", next: 1 },
          { name: "Lil Uzi Vert", descriptor: "American rapper", wikiTitle: "Lil Uzi Vert", color: "yellow", relationship: "Collaborated on music", next: 1 },
        ],
      },
      // 9 — detour: from Jeff Bezos → rejoin at step 1
      {
        from: "Jeff Bezos",
        main: false,
        options: [
          { name: "Kanye West", descriptor: "American rapper", wikiTitle: "Kanye West", color: "green", relationship: "Met at Met Gala events", next: 1 },
          { name: "Lauren Sánchez", descriptor: "Media personality", wikiTitle: "Lauren Sánchez", color: "yellow", relationship: "Partner since 2019", next: 1 },
          { name: "Mark Zuckerberg", descriptor: "Meta CEO", wikiTitle: "Mark Zuckerberg", color: "yellow", relationship: "Fellow tech billionaires", next: 1 },
          { name: "Mackenzie Scott", descriptor: "Philanthropist", wikiTitle: "MacKenzie Scott", color: "yellow", relationship: "Were married 1993–2019", next: 1 },
        ],
      },
      // 10 — detour: from Jay-Z → rejoin at step 2
      {
        from: "Jay-Z",
        main: false,
        options: [
          { name: "Kim Kardashian", descriptor: "Media personality", wikiTitle: "Kim Kardashian", color: "green", relationship: "Kanye's ex, family friends", next: 2 },
          { name: "Beyoncé", descriptor: "American singer", wikiTitle: "Beyoncé", color: "yellow", relationship: "Married since 2008", next: 2 },
          { name: "Nas", descriptor: "American rapper", wikiTitle: "Nas", color: "yellow", relationship: "Famous rap rivalry", next: 2 },
          { name: "Rihanna", descriptor: "Barbadian singer", wikiTitle: "Rihanna", color: "yellow", relationship: "Signed her to Def Jam", next: 2 },
        ],
      },
      // 11 — detour: from Pusha T → rejoin at step 2
      {
        from: "Pusha T",
        main: false,
        options: [
          { name: "Kim Kardashian", descriptor: "Media personality", wikiTitle: "Kim Kardashian", color: "green", relationship: "In Kanye's inner circle", next: 2 },
          { name: "Pharrell", descriptor: "American musician", wikiTitle: "Pharrell Williams", color: "yellow", relationship: "Produced Clipse records", next: 2 },
          { name: "Drake", descriptor: "Canadian rapper", wikiTitle: "Drake", color: "yellow", relationship: "Infamous rap beef", next: 2 },
          { name: "No Malice", descriptor: "American rapper", wikiTitle: "No Malice", color: "yellow", relationship: "Brother, Clipse duo", next: 2 },
        ],
      },
      // 12 — detour: from Virgil Abloh → rejoin at step 2
      {
        from: "Virgil Abloh",
        main: false,
        options: [
          { name: "Kim Kardashian", descriptor: "Media personality", wikiTitle: "Kim Kardashian", color: "green", relationship: "Designed for her wedding", next: 2 },
          { name: "Drake", descriptor: "Canadian rapper", wikiTitle: "Drake", color: "yellow", relationship: "Designed album artwork", next: 2 },
          { name: "Takashi Murakami", descriptor: "Japanese artist", wikiTitle: "Takashi Murakami", color: "yellow", relationship: "Art world collaborators", next: 2 },
          { name: "Rihanna", descriptor: "Barbadian singer", wikiTitle: "Rihanna", color: "yellow", relationship: "Fashion industry peers", next: 2 },
        ],
      },
      // 13 — detour: from Paris Hilton → rejoin at step 3
      {
        from: "Paris Hilton",
        main: false,
        options: [
          { name: "Pete Davidson", descriptor: "American comedian", wikiTitle: "Pete Davidson", color: "green", relationship: "Both NYC party scene", next: 3 },
          { name: "Nicole Richie", descriptor: "Media personality", wikiTitle: "Nicole Richie", color: "yellow", relationship: "The Simple Life co-stars", next: 3 },
          { name: "Lindsay Lohan", descriptor: "American actress", wikiTitle: "Lindsay Lohan", color: "yellow", relationship: "2000s tabloid rivals", next: 3 },
          { name: "Carter Reum", descriptor: "Entrepreneur", wikiTitle: "Carter Reum", color: "yellow", relationship: "Married since 2021", next: 3 },
        ],
      },
      // 14 — detour: from Kris Jenner → rejoin at step 3
      {
        from: "Kris Jenner",
        main: false,
        options: [
          { name: "Pete Davidson", descriptor: "American comedian", wikiTitle: "Pete Davidson", color: "green", relationship: "Dated her daughter Kim", next: 3 },
          { name: "Corey Gamble", descriptor: "Tour manager", wikiTitle: "Corey Gamble", color: "yellow", relationship: "Partner since 2014", next: 3 },
          { name: "Ryan Seacrest", descriptor: "TV host", wikiTitle: "Ryan Seacrest", color: "yellow", relationship: "Produced KUWTK together", next: 3 },
          { name: "Caitlyn Jenner", descriptor: "TV personality", wikiTitle: "Caitlyn Jenner", color: "yellow", relationship: "Were married 1991–2015", next: 3 },
        ],
      },
      // 15 — detour: from Jonathan Cheban → rejoin at step 3
      {
        from: "Jonathan Cheban",
        main: false,
        options: [
          { name: "Pete Davidson", descriptor: "American comedian", wikiTitle: "Pete Davidson", color: "green", relationship: "Both in Kardashian circle", next: 3 },
          { name: "Simon Huck", descriptor: "Publicist", wikiTitle: "Simon Huck", color: "yellow", relationship: "Best friends, PR world", next: 3 },
          { name: "Scott Disick", descriptor: "TV personality", wikiTitle: "Scott Disick", color: "yellow", relationship: "KUWTK castmates", next: 3 },
          { name: "Khloé Kardashian", descriptor: "Media personality", wikiTitle: "Khloé Kardashian", color: "yellow", relationship: "Close family friend", next: 3 },
        ],
      },
      // 16 — detour: from John Mulaney → rejoin at step 4
      {
        from: "John Mulaney",
        main: false,
        options: [
          { name: "Ariana Grande", descriptor: "American singer", wikiTitle: "Ariana Grande", color: "green", relationship: "Both hosted/performed on SNL", next: 4 },
          { name: "Nick Kroll", descriptor: "American comedian", wikiTitle: "Nick Kroll", color: "yellow", relationship: "Created Big Mouth together", next: 4 },
          { name: "Olivia Munn", descriptor: "American actress", wikiTitle: "Olivia Munn", color: "yellow", relationship: "Have a child together", next: 4 },
          { name: "Seth Meyers", descriptor: "TV host", wikiTitle: "Seth Meyers", color: "yellow", relationship: "SNL writers together", next: 4 },
        ],
      },
      // 17 — detour: from MGK → rejoin at step 4
      {
        from: "Machine Gun Kelly",
        main: false,
        options: [
          { name: "Ariana Grande", descriptor: "American singer", wikiTitle: "Ariana Grande", color: "green", relationship: "Both pop-crossover artists", next: 4 },
          { name: "Megan Fox", descriptor: "American actress", wikiTitle: "Megan Fox", color: "yellow", relationship: "Were engaged 2022–2024", next: 4 },
          { name: "Travis Barker", descriptor: "American drummer", wikiTitle: "Travis Barker", color: "yellow", relationship: "Close friends and collaborators", next: 4 },
          { name: "Eminem", descriptor: "American rapper", wikiTitle: "Eminem", color: "yellow", relationship: "Famous rap beef", next: 4 },
        ],
      },
      // 18 — detour: from Colin Jost → rejoin at step 4
      {
        from: "Colin Jost",
        main: false,
        options: [
          { name: "Ariana Grande", descriptor: "American singer", wikiTitle: "Ariana Grande", color: "green", relationship: "Both SNL regulars", next: 4 },
          { name: "Scarlett Johansson", descriptor: "American actress", wikiTitle: "Scarlett Johansson", color: "yellow", relationship: "Married since 2020", next: 4 },
          { name: "Michael Che", descriptor: "American comedian", wikiTitle: "Michael Che", color: "yellow", relationship: "Weekend Update co-anchors", next: 4 },
          { name: "Lorne Michaels", descriptor: "TV producer", wikiTitle: "Lorne Michaels", color: "yellow", relationship: "SNL creator and boss", next: 4 },
        ],
      },
      // 19 — detour: from Nicki Minaj → rejoin at step 5
      {
        from: "Nicki Minaj",
        main: false,
        options: [
          { name: "Ed Sheeran", descriptor: "English singer", wikiTitle: "Ed Sheeran", color: "green", relationship: "Both Republic Records artists", next: 5 },
          { name: "Drake", descriptor: "Canadian rapper", wikiTitle: "Drake", color: "yellow", relationship: "Young Money labelmates", next: 5 },
          { name: "Lil Wayne", descriptor: "American rapper", wikiTitle: "Lil Wayne", color: "yellow", relationship: "Signed her to Young Money", next: 5 },
          { name: "Cardi B", descriptor: "American rapper", wikiTitle: "Cardi B", color: "yellow", relationship: "Famous rivalry", next: 5 },
        ],
      },
      // 20 — detour: from Dalton Gomez → rejoin at step 5
      {
        from: "Dalton Gomez",
        main: false,
        options: [
          { name: "Ed Sheeran", descriptor: "English singer", wikiTitle: "Ed Sheeran", color: "green", relationship: "Through Ariana's music circle", next: 5 },
          { name: "Miley Cyrus", descriptor: "American singer", wikiTitle: "Miley Cyrus", color: "yellow", relationship: "LA social scene overlap", next: 5 },
          { name: "Scooter Braun", descriptor: "Talent manager", wikiTitle: "Scooter Braun", color: "yellow", relationship: "Managed Ariana", next: 5 },
          { name: "Justin Bieber", descriptor: "Canadian singer", wikiTitle: "Justin Bieber", color: "yellow", relationship: "Both managed by Scooter", next: 5 },
        ],
      },
      // 21 — detour: from Ethan Slater → rejoin at step 5
      {
        from: "Ethan Slater",
        main: false,
        options: [
          { name: "Ed Sheeran", descriptor: "English singer", wikiTitle: "Ed Sheeran", color: "green", relationship: "Through the UK music scene", next: 5 },
          { name: "Cynthia Erivo", descriptor: "English actress", wikiTitle: "Cynthia Erivo", color: "yellow", relationship: "Co-starred in Wicked", next: 5 },
          { name: "Jeff Goldblum", descriptor: "American actor", wikiTitle: "Jeff Goldblum", color: "yellow", relationship: "Co-starred in Wicked", next: 5 },
          { name: "Jon M. Chu", descriptor: "American director", wikiTitle: "Jon M. Chu", color: "yellow", relationship: "Directed Wicked film", next: 5 },
        ],
      },
      // 22 — detour: from Taylor Swift → target auto-complete
      {
        from: "Taylor Swift",
        main: false,
        options: [
          { name: "Adele", descriptor: "English singer", wikiTitle: "Adele", color: "green", relationship: "Mutual fans, Grammy peers", next: null },
          { name: "Selena Gomez", descriptor: "American singer", wikiTitle: "Selena Gomez", color: "yellow", relationship: "Best friends since 2008", next: null },
          { name: "Jack Antonoff", descriptor: "American musician", wikiTitle: "Jack Antonoff", color: "yellow", relationship: "Produced multiple albums", next: null },
          { name: "Travis Kelce", descriptor: "NFL player", wikiTitle: "Travis Kelce", color: "yellow", relationship: "Dating since 2023", next: null },
        ],
      },
      // 23 — detour: from Elton John → target auto-complete
      {
        from: "Elton John",
        main: false,
        options: [
          { name: "Adele", descriptor: "English singer", wikiTitle: "Adele", color: "green", relationship: "Fellow British music legends", next: null },
          { name: "David Furnish", descriptor: "Canadian filmmaker", wikiTitle: "David Furnish", color: "yellow", relationship: "Married since 2014", next: null },
          { name: "Billy Joel", descriptor: "American musician", wikiTitle: "Billy Joel", color: "yellow", relationship: "Piano Men tour together", next: null },
          { name: "Dua Lipa", descriptor: "English singer", wikiTitle: "Dua Lipa", color: "yellow", relationship: "Collaborated on Cold Heart", next: null },
        ],
      },
      // 24 — detour: from Stormzy → target auto-complete
      {
        from: "Stormzy",
        main: false,
        options: [
          { name: "Adele", descriptor: "English singer", wikiTitle: "Adele", color: "green", relationship: "Both from South London", next: null },
          { name: "Dave", descriptor: "English rapper", wikiTitle: "Dave (rapper)", color: "yellow", relationship: "UK rap scene peers", next: null },
          { name: "Maya Jama", descriptor: "English presenter", wikiTitle: "Maya Jama", color: "yellow", relationship: "Dated 2015–2019", next: null },
          { name: "Skepta", descriptor: "English rapper", wikiTitle: "Skepta", color: "yellow", relationship: "Grime scene pioneers", next: null },
        ],
      },
    ],
  },

  // ── Puzzle 3 (5 main steps): Oprah Winfrey → Billie Eilish ───
  {
    start: {
      name: "Oprah Winfrey",
      descriptor: "American media mogul",
      wikiTitle: "Oprah Winfrey",
      photoUrl: null,
    },
    target: {
      name: "Billie Eilish",
      descriptor: "American singer",
      wikiTitle: "Billie Eilish",
      photoUrl: null,
    },
    optimalLength: 5,
    steps: [
      // 0 — main: from Oprah
      {
        from: "Oprah Winfrey",
        main: true,
        options: [
          { name: "Barack Obama", descriptor: "44th US President", wikiTitle: "Barack Obama", color: "green", relationship: "Campaigned for him in 2008", next: 1 },
          { name: "Gayle King", descriptor: "TV journalist", wikiTitle: "Gayle King", color: "yellow", relationship: "Best friends for 40+ years", next: 6 },
          { name: "Dr. Phil", descriptor: "TV personality", wikiTitle: "Phil McGraw", color: "yellow", relationship: "Launched his TV career", next: 7 },
          { name: "Tyler Perry", descriptor: "American filmmaker", wikiTitle: "Tyler Perry", color: "yellow", relationship: "Close friends and collaborators", next: 8 },
        ],
      },
      // 1 — main: from Obama
      {
        from: "Barack Obama",
        main: true,
        options: [
          { name: "David Letterman", descriptor: "TV host", wikiTitle: "David Letterman", color: "green", relationship: "On his Netflix show My Next Guest", next: 2 },
          { name: "Michelle Obama", descriptor: "Former First Lady", wikiTitle: "Michelle Obama", color: "yellow", relationship: "Married since 1992", next: 9 },
          { name: "Jay-Z", descriptor: "American rapper", wikiTitle: "Jay-Z", color: "yellow", relationship: "Performed at his inauguration", next: 10 },
          { name: "Bruce Springsteen", descriptor: "American musician", wikiTitle: "Bruce Springsteen", color: "yellow", relationship: "Co-hosted podcast together", next: 11 },
        ],
      },
      // 2 — main: from Letterman
      {
        from: "David Letterman",
        main: true,
        options: [
          { name: "Kim Kardashian", descriptor: "Media personality", wikiTitle: "Kim Kardashian", color: "green", relationship: "In-depth Netflix interview", next: 3 },
          { name: "Bill Murray", descriptor: "American actor", wikiTitle: "Bill Murray", color: "yellow", relationship: "Closest Late Show friend", next: 12 },
          { name: "Tina Fey", descriptor: "American comedian", wikiTitle: "Tina Fey", color: "yellow", relationship: "Final-week tribute host", next: 13 },
          { name: "Jerry Seinfeld", descriptor: "American comedian", wikiTitle: "Jerry Seinfeld", color: "yellow", relationship: "Longtime friends", next: 14 },
        ],
      },
      // 3 — main: from Kim K
      {
        from: "Kim Kardashian",
        main: true,
        options: [
          { name: "Kanye West", descriptor: "American rapper", wikiTitle: "Kanye West", color: "green", relationship: "Married 2014–2022", next: 4 },
          { name: "Paris Hilton", descriptor: "Media personality", wikiTitle: "Paris Hilton", color: "yellow", relationship: "Was her assistant pre-fame", next: 15 },
          { name: "Pete Davidson", descriptor: "American comedian", wikiTitle: "Pete Davidson", color: "yellow", relationship: "Dated 2021–2022", next: 16 },
          { name: "Khloé Kardashian", descriptor: "Media personality", wikiTitle: "Khloé Kardashian", color: "yellow", relationship: "Sisters", next: 17 },
        ],
      },
      // 4 — main: from Kanye (final — green → target)
      {
        from: "Kanye West",
        main: true,
        options: [
          { name: "Billie Eilish", descriptor: "American singer", wikiTitle: "Billie Eilish", color: "green", relationship: "Public feud over concert safety", next: null },
          { name: "Travis Scott", descriptor: "American rapper", wikiTitle: "Travis Scott", color: "yellow", relationship: "Protégé and collaborator", next: 18 },
          { name: "Kid Cudi", descriptor: "American rapper", wikiTitle: "Kid Cudi", color: "yellow", relationship: "Made Kids See Ghosts together", next: 19 },
          { name: "Pharrell", descriptor: "American musician", wikiTitle: "Pharrell Williams", color: "yellow", relationship: "Produced tracks together", next: 20 },
        ],
      },

      // ── Detour steps ──────────────────────────────────────────

      // 5 — (unused index)

      // 6 — detour: from Gayle King → rejoin at step 1
      {
        from: "Gayle King",
        main: false,
        options: [
          { name: "Barack Obama", descriptor: "44th US President", wikiTitle: "Barack Obama", color: "green", relationship: "Interviewed him on CBS", next: 1 },
          { name: "Norah O'Donnell", descriptor: "TV journalist", wikiTitle: "Norah O'Donnell", color: "yellow", relationship: "Co-anchored CBS Mornings", next: 1 },
          { name: "Charles Barkley", descriptor: "TV analyst", wikiTitle: "Charles Barkley", color: "yellow", relationship: "Co-host on King Charles", next: 1 },
          { name: "Stedman Graham", descriptor: "Author", wikiTitle: "Stedman Graham", color: "yellow", relationship: "Through Oprah", next: 1 },
        ],
      },
      // 7 — detour: from Dr. Phil → rejoin at step 1
      {
        from: "Dr. Phil",
        main: false,
        options: [
          { name: "Barack Obama", descriptor: "44th US President", wikiTitle: "Barack Obama", color: "green", relationship: "Both daytime TV icons", next: 1 },
          { name: "Robin McGraw", descriptor: "TV personality", wikiTitle: "Robin McGraw", color: "yellow", relationship: "Married since 1976", next: 1 },
          { name: "Steve Harvey", descriptor: "TV host", wikiTitle: "Steve Harvey", color: "yellow", relationship: "Fellow daytime TV hosts", next: 1 },
          { name: "Dr. Oz", descriptor: "TV personality", wikiTitle: "Mehmet Oz", color: "yellow", relationship: "Both launched by Oprah", next: 1 },
        ],
      },
      // 8 — detour: from Tyler Perry → rejoin at step 1
      {
        from: "Tyler Perry",
        main: false,
        options: [
          { name: "Barack Obama", descriptor: "44th US President", wikiTitle: "Barack Obama", color: "green", relationship: "Hosted him at his studio", next: 1 },
          { name: "Viola Davis", descriptor: "American actress", wikiTitle: "Viola Davis", color: "yellow", relationship: "Directed her in multiple films", next: 1 },
          { name: "Taraji P. Henson", descriptor: "American actress", wikiTitle: "Taraji P. Henson", color: "yellow", relationship: "Starred in his films", next: 1 },
          { name: "Beyoncé", descriptor: "American singer", wikiTitle: "Beyoncé", color: "yellow", relationship: "Atlanta industry neighbors", next: 1 },
        ],
      },
      // 9 — detour: from Michelle Obama → rejoin at step 2
      {
        from: "Michelle Obama",
        main: false,
        options: [
          { name: "David Letterman", descriptor: "TV host", wikiTitle: "David Letterman", color: "green", relationship: "Guest on his Netflix show", next: 2 },
          { name: "Jill Biden", descriptor: "First Lady", wikiTitle: "Jill Biden", color: "yellow", relationship: "Close friends since 2008", next: 2 },
          { name: "Gayle King", descriptor: "TV journalist", wikiTitle: "Gayle King", color: "yellow", relationship: "Close friends", next: 2 },
          { name: "Beyoncé", descriptor: "American singer", wikiTitle: "Beyoncé", color: "yellow", relationship: "Close friends", next: 2 },
        ],
      },
      // 10 — detour: from Jay-Z → rejoin at step 2
      {
        from: "Jay-Z",
        main: false,
        options: [
          { name: "David Letterman", descriptor: "TV host", wikiTitle: "David Letterman", color: "green", relationship: "Guest on Late Show", next: 2 },
          { name: "Beyoncé", descriptor: "American singer", wikiTitle: "Beyoncé", color: "yellow", relationship: "Married since 2008", next: 2 },
          { name: "Nas", descriptor: "American rapper", wikiTitle: "Nas", color: "yellow", relationship: "Famous rivalry turned peace", next: 2 },
          { name: "Kanye West", descriptor: "American rapper", wikiTitle: "Kanye West", color: "yellow", relationship: "Made Watch the Throne together", next: 2 },
        ],
      },
      // 11 — detour: from Springsteen → rejoin at step 2
      {
        from: "Bruce Springsteen",
        main: false,
        options: [
          { name: "David Letterman", descriptor: "TV host", wikiTitle: "David Letterman", color: "green", relationship: "Performed on his final show", next: 2 },
          { name: "Jon Bon Jovi", descriptor: "American musician", wikiTitle: "Jon Bon Jovi", color: "yellow", relationship: "Both Jersey rock icons", next: 2 },
          { name: "Patti Scialfa", descriptor: "American musician", wikiTitle: "Patti Scialfa", color: "yellow", relationship: "Married since 1991", next: 2 },
          { name: "Steven Van Zandt", descriptor: "American musician", wikiTitle: "Steven Van Zandt", color: "yellow", relationship: "E Street Band guitarist", next: 2 },
        ],
      },
      // 12 — detour: from Bill Murray → rejoin at step 3
      {
        from: "Bill Murray",
        main: false,
        options: [
          { name: "Kim Kardashian", descriptor: "Media personality", wikiTitle: "Kim Kardashian", color: "green", relationship: "Both pop culture icons", next: 3 },
          { name: "Dan Aykroyd", descriptor: "Canadian actor", wikiTitle: "Dan Aykroyd", color: "yellow", relationship: "Ghostbusters co-stars", next: 3 },
          { name: "Wes Anderson", descriptor: "American filmmaker", wikiTitle: "Wes Anderson", color: "yellow", relationship: "Directed him in six films", next: 3 },
          { name: "Scarlett Johansson", descriptor: "American actress", wikiTitle: "Scarlett Johansson", color: "yellow", relationship: "Co-starred in Lost in Translation", next: 3 },
        ],
      },
      // 13 — detour: from Tina Fey → rejoin at step 3
      {
        from: "Tina Fey",
        main: false,
        options: [
          { name: "Kim Kardashian", descriptor: "Media personality", wikiTitle: "Kim Kardashian", color: "green", relationship: "Parodied her on SNL", next: 3 },
          { name: "Amy Poehler", descriptor: "American comedian", wikiTitle: "Amy Poehler", color: "yellow", relationship: "SNL co-anchors, best friends", next: 3 },
          { name: "Alec Baldwin", descriptor: "American actor", wikiTitle: "Alec Baldwin", color: "yellow", relationship: "30 Rock co-stars", next: 3 },
          { name: "Steve Carell", descriptor: "American actor", wikiTitle: "Steve Carell", color: "yellow", relationship: "Second City alumni", next: 3 },
        ],
      },
      // 14 — detour: from Jerry Seinfeld → rejoin at step 3
      {
        from: "Jerry Seinfeld",
        main: false,
        options: [
          { name: "Kim Kardashian", descriptor: "Media personality", wikiTitle: "Kim Kardashian", color: "green", relationship: "Both NYC cultural fixtures", next: 3 },
          { name: "Larry David", descriptor: "American comedian", wikiTitle: "Larry David", color: "yellow", relationship: "Created Seinfeld together", next: 3 },
          { name: "Eddie Murphy", descriptor: "American actor", wikiTitle: "Eddie Murphy", color: "yellow", relationship: "Stand-up comedy peers", next: 3 },
          { name: "Chris Rock", descriptor: "American comedian", wikiTitle: "Chris Rock", color: "yellow", relationship: "Longtime friends", next: 3 },
        ],
      },
      // 15 — detour: from Paris Hilton → rejoin at step 4
      {
        from: "Paris Hilton",
        main: false,
        options: [
          { name: "Kanye West", descriptor: "American rapper", wikiTitle: "Kanye West", color: "green", relationship: "Both 2000s pop culture icons", next: 4 },
          { name: "Nicole Richie", descriptor: "Media personality", wikiTitle: "Nicole Richie", color: "yellow", relationship: "The Simple Life co-stars", next: 4 },
          { name: "Lindsay Lohan", descriptor: "American actress", wikiTitle: "Lindsay Lohan", color: "yellow", relationship: "2000s tabloid rivals", next: 4 },
          { name: "Britney Spears", descriptor: "American singer", wikiTitle: "Britney Spears", color: "yellow", relationship: "2000s party scene trio", next: 4 },
        ],
      },
      // 16 — detour: from Pete Davidson → rejoin at step 4
      {
        from: "Pete Davidson",
        main: false,
        options: [
          { name: "Kanye West", descriptor: "American rapper", wikiTitle: "Kanye West", color: "green", relationship: "Public feud over Kim", next: 4 },
          { name: "John Mulaney", descriptor: "American comedian", wikiTitle: "John Mulaney", color: "yellow", relationship: "SNL writing partners", next: 4 },
          { name: "Ariana Grande", descriptor: "American singer", wikiTitle: "Ariana Grande", color: "yellow", relationship: "Engaged in 2018", next: 4 },
          { name: "Machine Gun Kelly", descriptor: "American rapper", wikiTitle: "Machine Gun Kelly", color: "yellow", relationship: "Close friends and co-stars", next: 4 },
        ],
      },
      // 17 — detour: from Khloé → rejoin at step 4
      {
        from: "Khloé Kardashian",
        main: false,
        options: [
          { name: "Kanye West", descriptor: "American rapper", wikiTitle: "Kanye West", color: "green", relationship: "Former brother-in-law", next: 4 },
          { name: "Tristan Thompson", descriptor: "NBA player", wikiTitle: "Tristan Thompson", color: "yellow", relationship: "On-off relationship", next: 4 },
          { name: "Kourtney Kardashian", descriptor: "Media personality", wikiTitle: "Kourtney Kardashian", color: "yellow", relationship: "Sisters", next: 4 },
          { name: "Lamar Odom", descriptor: "Former NBA player", wikiTitle: "Lamar Odom", color: "yellow", relationship: "Were married 2009–2016", next: 4 },
        ],
      },
      // 18 — detour: from Travis Scott → target auto-complete
      {
        from: "Travis Scott",
        main: false,
        options: [
          { name: "Billie Eilish", descriptor: "American singer", wikiTitle: "Billie Eilish", color: "green", relationship: "Both Gen-Z music icons", next: null },
          { name: "Kylie Jenner", descriptor: "Media personality", wikiTitle: "Kylie Jenner", color: "yellow", relationship: "Have two children together", next: null },
          { name: "Drake", descriptor: "Canadian rapper", wikiTitle: "Drake", color: "yellow", relationship: "Collaborated on SICKO MODE", next: null },
          { name: "Don Toliver", descriptor: "American rapper", wikiTitle: "Don Toliver", color: "yellow", relationship: "Cactus Jack signee", next: null },
        ],
      },
      // 19 — detour: from Kid Cudi → target auto-complete
      {
        from: "Kid Cudi",
        main: false,
        options: [
          { name: "Billie Eilish", descriptor: "American singer", wikiTitle: "Billie Eilish", color: "green", relationship: "Both genre-bending artists", next: null },
          { name: "Timothée Chalamet", descriptor: "American actor", wikiTitle: "Timothée Chalamet", color: "yellow", relationship: "Close friends", next: null },
          { name: "ASAP Rocky", descriptor: "American rapper", wikiTitle: "ASAP Rocky", color: "yellow", relationship: "Rap and fashion peers", next: null },
          { name: "Selena Gomez", descriptor: "American singer", wikiTitle: "Selena Gomez", color: "yellow", relationship: "Collaborated on music", next: null },
        ],
      },
      // 20 — detour: from Pharrell → target auto-complete
      {
        from: "Pharrell",
        main: false,
        options: [
          { name: "Billie Eilish", descriptor: "American singer", wikiTitle: "Billie Eilish", color: "green", relationship: "Interviewed her for i-D", next: null },
          { name: "Tyler, the Creator", descriptor: "American rapper", wikiTitle: "Tyler, the Creator", color: "yellow", relationship: "Mentored and collaborated", next: null },
          { name: "Daft Punk", descriptor: "French duo", wikiTitle: "Daft Punk", color: "yellow", relationship: "Made Get Lucky together", next: null },
          { name: "Chad Hugo", descriptor: "American musician", wikiTitle: "Chad Hugo", color: "yellow", relationship: "The Neptunes duo", next: null },
        ],
      },
    ],
  },
];

export { DEMO_PUZZLES };
