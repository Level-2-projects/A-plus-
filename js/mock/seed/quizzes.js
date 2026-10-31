/**
 * js/mock/seed/quizzes.js – Seed quiz data with embedded questions.
 * One completed-window quiz and one upcoming quiz per course.
 * Auto-grading uses correct_index to evaluate student answers.
 * Depends on: Nothing.
 */

export const SEED_QUIZZES = [
  /* ── Course A: SE301 ── */
  {
    id: "qz-a1",
    course_id: "crs-a",
    title: "Quiz 1: Design Patterns Identification",
    duration_minutes: 20,
    available_from: "2026-10-25T08:00:00Z",
    available_to: "2026-10-26T23:59:00Z",  // window closed → past
    questions: [
      {
        id: "qa1q1",
        text: "Which pattern separates an abstraction from its implementation so they can vary independently?",
        options: ["Adapter", "Bridge", "Decorator", "Composite"],
        correct_index: 1,
        points: 1,
      },
      {
        id: "qa1q2",
        text: "The Observer pattern is primarily used to implement which concept?",
        options: ["Inheritance hierarchies", "Event-driven communication", "Data caching", "Object pooling"],
        correct_index: 1,
        points: 1,
      },
      {
        id: "qa1q3",
        text: "Which pattern ensures only one instance of a class exists?",
        options: ["Factory Method", "Prototype", "Singleton", "Builder"],
        correct_index: 2,
        points: 1,
      },
      {
        id: "qa1q4",
        text: "The Strategy pattern enables:",
        options: [
          "Lazy object creation",
          "Switching algorithms at runtime",
          "Undoable operations",
          "Object tree traversal",
        ],
        correct_index: 1,
        points: 1,
      },
      {
        id: "qa1q5",
        text: "Which pattern converts the interface of a class into another interface that clients expect?",
        options: ["Facade", "Proxy", "Adapter", "Flyweight"],
        correct_index: 2,
        points: 1,
      },
    ],
  },
  {
    id: "qz-a2",
    course_id: "crs-a",
    title: "Quiz 2: Architectural Styles",
    duration_minutes: 25,
    available_from: "2026-11-05T08:00:00Z",
    available_to: "2026-11-06T23:59:00Z",  // future
    questions: [
      {
        id: "qa2q1",
        text: "In a Hexagonal Architecture, what is an 'adapter'?",
        options: [
          "An implementation of a domain service",
          "The translation layer between domain and external system",
          "A domain entity",
          "A use-case orchestrator",
        ],
        correct_index: 1,
        points: 1,
      },
      {
        id: "qa2q2",
        text: "CQRS stands for:",
        options: [
          "Command Query Responsibility Segregation",
          "Component Query Resource Separation",
          "Controller Query Response Structure",
          "Command Queue Request Service",
        ],
        correct_index: 0,
        points: 1,
      },
    ],
  },

  /* ── Course B: SE304 ── */
  {
    id: "qz-b1",
    course_id: "crs-b",
    title: "Quiz 1: Process Scheduling",
    duration_minutes: 15,
    available_from: "2026-10-27T08:00:00Z",
    available_to: "2026-10-28T23:59:00Z",  // past
    questions: [
      {
        id: "qb1q1",
        text: "Which scheduling algorithm may cause starvation?",
        options: ["Round Robin", "FCFS", "Priority Scheduling", "Multilevel Queue"],
        correct_index: 2,
        points: 1,
      },
      {
        id: "qb1q2",
        text: "Round-Robin scheduling uses a concept called:",
        options: ["Priority level", "Time quantum", "Arrival rate", "Burst window"],
        correct_index: 1,
        points: 1,
      },
      {
        id: "qb1q3",
        text: "In SJF (non-preemptive), a new short process arriving will:",
        options: [
          "Preempt the running process",
          "Wait until the running process finishes",
          "Be discarded",
          "Inherit the running process's priority",
        ],
        correct_index: 1,
        points: 1,
      },
    ],
  },
  {
    id: "qz-b2",
    course_id: "crs-b",
    title: "Quiz 2: Memory Management",
    duration_minutes: 20,
    available_from: "2026-11-10T08:00:00Z",
    available_to: "2026-11-11T23:59:00Z",  // future
    questions: [
      {
        id: "qb2q1",
        text: "What is the purpose of a TLB (Translation Lookaside Buffer)?",
        options: [
          "To store the page table permanently",
          "To speed up virtual-to-physical address translation",
          "To handle page faults",
          "To compress memory pages",
        ],
        correct_index: 1,
        points: 1,
      },
    ],
  },

  /* ── Course C: SE302 ── */
  {
    id: "qz-c1",
    course_id: "crs-c",
    title: "Quiz 1: REST Fundamentals",
    duration_minutes: 15,
    available_from: "2026-10-28T08:00:00Z",
    available_to: "2026-10-29T23:59:00Z",  // past
    questions: [
      {
        id: "qc1q1",
        text: "Which HTTP method is idempotent AND safe?",
        options: ["POST", "DELETE", "GET", "PATCH"],
        correct_index: 2,
        points: 1,
      },
      {
        id: "qc1q2",
        text: "A REST API returning 201 Created should also include:",
        options: [
          "A redirect header",
          "A Location header pointing to the new resource",
          "An ETag header",
          "A WWW-Authenticate header",
        ],
        correct_index: 1,
        points: 1,
      },
    ],
  },
  {
    id: "qz-c2",
    course_id: "crs-c",
    title: "Quiz 2: API Security",
    duration_minutes: 20,
    available_from: "2026-11-11T08:00:00Z",
    available_to: "2026-11-12T23:59:00Z",  // future
    questions: [
      {
        id: "qc2q1",
        text: "JWT stands for:",
        options: [
          "Java Web Toolkit",
          "JSON Web Token",
          "JavaScript Webservice Transport",
          "Joint Web Transfer",
        ],
        correct_index: 1,
        points: 1,
      },
    ],
  },
];
