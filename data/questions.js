export const subjects = ["Winter Project Selection Test"];

export const sections = [
  "Section 1: General Aptitude",
  "Section 2: Core Concepts",
  "Section 3: Analytical Problem Solving",
  "Section 4: Numerical & Integer Type"
];

const sharedQuestions = [
    // --- SECTION 1 ---
    {
      id: 1,
      section: "Section 1",
      sectionIndex: 0,
      type: "mcq",
      question: "Which of the following processes represents a chemical change?",
      options: ["Melting of ice", "Rusting of iron", "Boiling of water", "Dissolution of salt in water"],
      correctAnswer: 1
    },
    {
      id: 2,
      section: "Section 1",
      sectionIndex: 0,
      type: "mcq",
      question: "In a certain code language, if 'CAT' is coded as 24 and 'DOG' is coded as 26, what is the code for 'BAT'?",
      options: ["20", "22", "23", "25"],
      correctAnswer: 2
    },
    {
      id: 3,
      section: "Section 1",
      sectionIndex: 0,
      type: "integer",
      question: "Find the missing number in the sequence: 2, 6, 12, 20, 30, ?",
      correctAnswer: 42
    },

    // --- SECTION 2 ---
    {
      id: 4,
      section: "Section 2",
      sectionIndex: 1,
      type: "mcq",
      question: "What is the time complexity of searching an element in a balanced Binary Search Tree (BST) with N nodes?",
      options: ["O(1)", "O(log N)", "O(N)", "O(N log N)"],
      correctAnswer: 1
    },
    {
      id: 5,
      section: "Section 2",
      sectionIndex: 1,
      type: "mcq",
      question: "Which layer of the OSI model is responsible for end-to-end reliable transmission and flow control?",
      options: ["Network Layer", "Data Link Layer", "Transport Layer", "Session Layer"],
      correctAnswer: 2
    },
    {
      id: 6,
      section: "Section 2",
      sectionIndex: 1,
      type: "integer",
      question: "How many bits are there in an IPv4 address?",
      correctAnswer: 32
    },

    // --- SECTION 3 ---
    {
      id: 7,
      section: "Section 3",
      sectionIndex: 2,
      type: "mcq",
      question: "If a matrix A has dimensions 3x4 and matrix B has dimensions 4x2, what are the dimensions of the product matrix AB?",
      options: ["3x2", "4x4", "2x3", "Multiplication is not defined"],
      correctAnswer: 0
    },
    {
      id: 8,
      section: "Section 3",
      sectionIndex: 2,
      type: "integer",
      question: "Calculate the value of the determinant of a 2x2 identity matrix multiplied by 5: det([[5, 0], [0, 5]]).",
      correctAnswer: 25
    },

    // --- SECTION 4 (Numerical / Integer Section) ---
    {
      id: 9,
      section: "Section 4",
      sectionIndex: 3,
      type: "integer",
      question: "What is the sum of the first 10 positive integers (1 + 2 + ... + 10)?",
      correctAnswer: 55
    },
    {
      id: 10,
      section: "Section 4",
      sectionIndex: 3,
      type: "integer",
      question: "If 3^(x - 1) = 81, what is the integer value of x?",
      correctAnswer: 5
    },
    {
      id: 11,
      section: "Section 4",
      sectionIndex: 3,
      type: "integer",
      question: "A train traveling at 72 km/h crosses a pole in 10 seconds. What is the length of the train in meters?",
      correctAnswer: 200
    },
    {
      id: 12,
      section: "Section 4",
      sectionIndex: 3,
      type: "mcq",
      question: "Which of the following is the smallest prime number greater than 50?",
      options: ["51", "53", "57", "59"],
      correctAnswer: 1
    }
  ];

export const questionsData = {
  "Winter Project Selection Test": sharedQuestions,
  "Examination": sharedQuestions,
};
