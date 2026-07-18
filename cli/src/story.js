export const story = {
  arrival: {
    chapter: "01 / THE QUIET SIDE",
    location: "ORBIT",
    title: "A signal beneath the ice",
    objective: "Choose how to answer",
    body:
      "Your survey craft is alone above a moon that was catalogued as silent. Then a slow pulse rises through the ice—three notes, a pause, and three more. It is too deliberate to be weather.",
    lesson: "Some discoveries begin by answering the unknown.",
    choices: [
      {
        command: "answer signal",
        aliases: ["reply", "send three notes", "respond to signal"],
        label: "Answer with the same three notes",
        detail: "Let the moon know it was heard",
        next: "descent",
        feedback: "The pulse returns immediately. Something below has been waiting.",
        effect: { signal: 1, insight: "You answered the unknown." },
      },
      {
        command: "mark coordinates",
        aliases: ["save location", "record signal", "observe"],
        label: "Record the coordinates and remain silent",
        detail: "Keep distance from what you do not understand",
        next: "descent",
        feedback: "The signal repeats, patient and unchanged, as you begin the descent.",
        effect: { signal: 0 },
      },
    ],
  },

  descent: {
    chapter: "02 / DESCENT",
    location: "CRATER NINE",
    title: "The door with no seam",
    objective: "Find a way beneath the surface",
    body:
      "At the signal's origin, the ice is polished into a perfect black circle. Your lamp finds no handle, only three shallow hollows arranged like the notes you heard in orbit.",
    lesson: "Patterns can be invitations, warnings, or both.",
    choices: [
      {
        command: "touch hollows",
        aliases: ["press symbols", "play pattern", "touch pattern"],
        label: "Touch the hollows in the signal's rhythm",
        detail: "Complete the pattern",
        next: "archive",
        feedback: "The circle opens without moving. Gravity turns sideways and carries you in.",
        effect: { signal: 1, insight: "You trusted the pattern." },
      },
      {
        command: "cut the ice",
        aliases: ["drill", "force door", "open with cutter"],
        label: "Use the hull cutter around the circle",
        detail: "Make your own entrance",
        next: "archive",
        feedback: "The cutter leaves no mark. When you stop, the door opens on its own.",
        effect: { signal: 0 },
      },
    ],
  },

  archive: {
    chapter: "03 / THE ARCHIVE",
    location: "BELOW THE ICE",
    title: "A sky stored in glass",
    objective: "Choose what to carry home",
    body:
      "Inside, thousands of glass seeds hold fragments of an extinct world's night sky. One seed is warm in your hand. The chamber asks for a destination in a language you somehow understand.",
    lesson: "To preserve a thing is also to choose where its next story begins.",
    choices: [
      {
        command: "share the sky",
        aliases: ["send to earth", "take archive home", "share archive"],
        label: "Carry one seed home for everyone",
        detail: "Let a lost sky be seen again",
        next: "finale",
        feedback: "The archive marks Earth with a small point of light. The seed begins to sing.",
        effect: { signal: 1, insight: "You chose to share the sky." },
      },
      {
        command: "leave it sleeping",
        aliases: ["leave seed", "close archive", "do not take it"],
        label: "Return the seed and seal the chamber",
        detail: "Some inheritances can wait",
        next: "finale",
        feedback: "The glass cools. Above you, the moon resumes its patient three-note call.",
        effect: { signal: 0 },
      },
    ],
  },

  finale: {
    chapter: "COMPLETE",
    location: "RETURN VECTOR",
    title: "The moon is no longer silent",
    objective: "Begin another journey",
    body:
      "Your craft climbs into orbit carrying either a star-filled seed or the knowledge of where it sleeps. Behind you, three lights appear beneath the ice—an answer, a farewell, or a promise.",
    lesson: "Mystery survives the choices we make around it.",
    choices: [],
  },
};
