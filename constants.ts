
import { Level, LevelMeta, WordEntry } from './types';

export const LEVELS: Level[] = [
  {
    id: 'raz-aa-a',
    name: '🌟 Level aa-A',
    category: 'Foundations',
    thumbnail: '🍎',
    questions: [
      { correctWord: 'Cat', options: [{ word: 'Cat', image: '🐱' }, { word: 'Dog', image: '🐶' }, { word: 'Pig', image: '🐷' }] },
      { correctWord: 'Apple', options: [{ word: 'Pear', image: '🍐' }, { word: 'Apple', image: '🍎' }, { word: 'Banana', image: '🍌' }] },
      { correctWord: 'Sun', options: [{ word: 'Moon', image: '🌙' }, { word: 'Star', image: '⭐' }, { word: 'Sun', image: '☀️' }] },
      { correctWord: 'Ball', options: [{ word: 'Box', image: '📦' }, { word: 'Ball', image: '⚽' }, { word: 'Bat', image: '🏏' }] },
      { correctWord: 'Bee', options: [{ word: 'Bee', image: '🐝' }, { word: 'Ant', image: '🐜' }, { word: 'Fly', image: '🪰' }] },
      { correctWord: 'Bed', options: [{ word: 'Desk', image: '🖥️' }, { word: 'Bed', image: '🛏️' }, { word: 'Chair', image: '🪑' }] },
      { correctWord: 'Fish', options: [{ word: 'Shark', image: '🦈' }, { word: 'Whale', image: '🐋' }, { word: 'Fish', image: '🐟' }] },
      { correctWord: 'Book', options: [{ word: 'Pen', image: '🖊️' }, { word: 'Bag', image: '🎒' }, { word: 'Book', image: '📖' }] },
      { correctWord: 'Tree', options: [{ word: 'Tree', image: '🌳' }, { word: 'Flower', image: '🌻' }, { word: 'Grass', image: '🌿' }] },
      { correctWord: 'Hat', options: [{ word: 'Sock', image: '🧦' }, { word: 'Shoe', image: '👟' }, { word: 'Hat', image: '🎩' }] }
    ]
  },
  {
    id: 'raz-b-c',
    name: '🌈 Level B-C',
    category: 'Exploration',
    thumbnail: '🐸',
    questions: [
      { correctWord: 'Frog', options: [{ word: 'Toad', image: '🐸' }, { word: 'Snake', image: '🐍' }, { word: 'Frog', image: '🐸' }] },
      { correctWord: 'Jump', options: [{ word: 'Sit', image: '🪑' }, { word: 'Sleep', image: '😴' }, { word: 'Jump', image: '🦘' }] },
      { correctWord: 'Bird', options: [{ word: 'Plane', image: '✈️' }, { word: 'Bird', image: '🐦' }, { word: 'Bat', image: '🦇' }] },
      { correctWord: 'Rain', options: [{ word: 'Snow', image: '❄️' }, { word: 'Rain', image: '🌧️' }, { word: 'Wind', image: '💨' }] },
      { correctWord: 'Milk', options: [{ word: 'Milk', image: '🥛' }, { word: 'Juice', image: '🧃' }, { word: 'Water', image: '💧' }] },
      { correctWord: 'Duck', options: [{ word: 'Goose', image: '🦢' }, { word: 'Duck', image: '🦆' }, { word: 'Swan', image: '🦢' }] },
      { correctWord: 'Farm', options: [{ word: 'City', image: '🏙️' }, { word: 'Park', image: '⛲' }, { word: 'Farm', image: '🚜' }] },
      { correctWord: 'Leaf', options: [{ word: 'Stem', image: '🌱' }, { word: 'Root', image: '🥕' }, { word: 'Leaf', image: '🍃' }] },
      { correctWord: 'Cake', options: [{ word: 'Pie', image: '🥧' }, { word: 'Cake', image: '🍰' }, { word: 'Cookie', image: '🍪' }] },
      { correctWord: 'Hand', options: [{ word: 'Foot', image: '🦶' }, { word: 'Head', image: '👤' }, { word: 'Hand', image: '🤚' }] }
    ]
  },
  {
    id: 'raz-d-e',
    name: '🚀 Level D-E',
    category: 'Adventure',
    thumbnail: '👨‍⚕️',
    questions: [
      { correctWord: 'Doctor', options: [{ word: 'Doctor', image: '🩺' }, { word: 'Nurse', image: '👩‍⚕️' }, { word: 'Pilot', image: '👨‍✈️' }] },
      { correctWord: 'School', options: [{ word: 'House', image: '🏠' }, { word: 'School', image: '🏫' }, { word: 'Shop', image: '🛒' }] },
      { correctWord: 'Summer', options: [{ word: 'Fall', image: '🍂' }, { word: 'Spring', image: '🌸' }, { word: 'Summer', image: '☀️' }] },
      { correctWord: 'Rabbit', options: [{ word: 'Mouse', image: '🐭' }, { word: 'Rat', image: '🐀' }, { word: 'Rabbit', image: '🐰' }] },
      { correctWord: 'Winter', options: [{ word: 'Winter', image: '❄️' }, { word: 'Summer', image: '🏖️' }, { word: 'Rain', image: '☔' }] },
      { correctWord: 'Orange', options: [{ word: 'Lemon', image: '🍋' }, { word: 'Lime', image: '🍈' }, { word: 'Orange', image: '🍊' }] },
      { correctWord: 'Monkey', options: [{ word: 'Monkey', image: '🐒' }, { word: 'Ape', image: '🦍' }, { word: 'Chimp', image: '🦧' }] },
      { correctWord: 'Spider', options: [{ word: 'Spider', image: '🕷️' }, { word: 'Beetle', image: '🪲' }, { word: 'Crab', image: '🦀' }] },
      { correctWord: 'Rocket', options: [{ word: 'Car', image: '🚗' }, { word: 'Bike', image: '🚲' }, { word: 'Rocket', image: '🚀' }] },
      { correctWord: 'Flower', options: [{ word: 'Bush', image: '🌳' }, { word: 'Vine', image: '🪴' }, { word: 'Flower', image: '🌻' }] }
    ]
  },
  {
    id: 'raz-f',
    name: '🌳 Level F',
    category: 'Nature',
    thumbnail: '🏞️',
    questions: [
      { correctWord: 'Mountain', options: [{ word: 'Hill', image: '⛰️' }, { word: 'Mountain', image: '🏔️' }, { word: 'Valley', image: '🛤️' }] },
      { correctWord: 'River', options: [{ word: 'Lake', image: '🏞️' }, { word: 'River', image: '🌊' }, { word: 'Pond', image: '💧' }] },
      { correctWord: 'Forest', options: [{ word: 'Park', image: '⛲' }, { word: 'Garden', image: '🏡' }, { word: 'Forest', image: '🌲' }] },
      { correctWord: 'Cloud', options: [{ word: 'Fog', image: '🌫️' }, { word: 'Cloud', image: '☁️' }, { word: 'Storm', image: '⛈️' }] },
      { correctWord: 'Ocean', options: [{ word: 'Beach', image: '🏖️' }, { word: 'Ocean', image: '🌊' }, { word: 'Island', image: '🏝️' }] },
      { correctWord: 'Desert', options: [{ word: 'Beach', image: '🏖️' }, { word: 'Desert', image: '🌵' }, { word: 'Field', image: '🌾' }] },
      { correctWord: 'Rainbow', options: [{ word: 'Rain', image: '🌧️' }, { word: 'Sun', image: '☀️' }, { word: 'Rainbow', image: '🌈' }] },
      { correctWord: 'Cave', options: [{ word: 'Hole', image: '🕳️' }, { word: 'Cave', image: '🦇' }, { word: 'Tunnel', image: '🚇' }] },
      { correctWord: 'Bridge', options: [{ word: 'Road', image: '🛣️' }, { word: 'Bridge', image: '🌉' }, { word: 'Wall', image: '🧱' }] },
      { correctWord: 'Stone', options: [{ word: 'Sand', image: '🏖️' }, { word: 'Dirt', image: '🟫' }, { word: 'Stone', image: '🪨' }] }
    ]
  },
  {
    id: 'raz-g',
    name: '🏡 Level G',
    category: 'Community',
    thumbnail: '🏢',
    questions: [
      { correctWord: 'Library', options: [{ word: 'Library', image: '📚' }, { word: 'Shop', image: '🛍️' }, { word: 'School', image: '🏫' }] },
      { correctWord: 'Market', options: [{ word: 'Bank', image: '🏦' }, { word: 'Market', image: '🛒' }, { word: 'Cafe', image: '☕' }] },
      { correctWord: 'Police', options: [{ word: 'Guard', image: '💂' }, { word: 'Police', image: '👮' }, { word: 'Soldier', image: '🪖' }] },
      { correctWord: 'Baker', options: [{ word: 'Cook', image: '👨‍🍳' }, { word: 'Baker', image: '🥯' }, { word: 'Farmer', image: '👨‍🌾' }] },
      { correctWord: 'Hospital', options: [{ word: 'Office', image: '🏢' }, { word: 'Hospital', image: '🏥' }, { word: 'Hotel', image: '🏨' }] },
      { correctWord: 'Park', options: [{ word: 'Park', image: '🛝' }, { word: 'Street', image: '🛣️' }, { word: 'House', image: '🏠' }] },
      { correctWord: 'Bus', options: [{ word: 'Truck', image: '🚚' }, { word: 'Bus', image: '🚌' }, { word: 'Van', image: '🚐' }] },
      { correctWord: 'Post', options: [{ word: 'Mail', image: '✉️' }, { word: 'Post', image: '🏤' }, { word: 'Sign', image: '🪧' }] },
      { correctWord: 'Church', options: [{ word: 'Castle', image: '🏰' }, { word: 'Tower', image: '🗼' }, { word: 'Church', image: '⛪' }] },
      { correctWord: 'Theater', options: [{ word: 'Theater', image: '🎭' }, { word: 'Zoo', image: '🦒' }, { word: 'Gym', image: '🏋️' }] }
    ]
  },
  {
    id: 'raz-h',
    name: '🦁 Level H',
    category: 'Zoo',
    thumbnail: '🦒',
    questions: [
      { correctWord: 'Lion', options: [{ word: 'Tiger', image: '🐅' }, { word: 'Lion', image: '🦁' }, { word: 'Bear', image: '🐻' }] },
      { correctWord: 'Elephant', options: [{ word: 'Hippo', image: '🦛' }, { word: 'Elephant', image: '🐘' }, { word: 'Rhino', image: '🦏' }] },
      { correctWord: 'Giraffe', options: [{ word: 'Deer', image: '🦌' }, { word: 'Giraffe', image: '🦒' }, { word: 'Zebra', image: '🦓' }] },
      { correctWord: 'Monkey', options: [{ word: 'Sloth', image: '🦥' }, { word: 'Monkey', image: '🐒' }, { word: 'Koala', image: '🐨' }] },
      { correctWord: 'Crocodile', options: [{ word: 'Lizard', image: '🦎' }, { word: 'Crocodile', image: '🐊' }, { word: 'Turtle', image: '🐢' }] },
      { correctWord: 'Parrot', options: [{ word: 'Parrot', image: '🦜' }, { word: 'Owl', image: '🦉' }, { word: 'Eagle', image: '🦅' }] },
      { correctWord: 'Snake', options: [{ word: 'Worm', image: '🪱' }, { word: 'Snake', image: '🐍' }, { word: 'Eel', image: '🐍' }] },
      { correctWord: 'Kangaroo', options: [{ word: 'Kangaroo', image: '🦘' }, { word: 'Wallaby', image: '🦘' }, { word: 'Rabbit', image: '🐰' }] },
      { correctWord: 'Penguin', options: [{ word: 'Seal', image: '🦭' }, { word: 'Penguin', image: '🐧' }, { word: 'Whale', image: '🐋' }] },
      { correctWord: 'Zebra', options: [{ word: 'Horse', image: '🐎' }, { word: 'Donkey', image: '🫏' }, { word: 'Zebra', image: '🦓' }] }
    ]
  },
  {
    id: 'raz-i',
    name: '🌌 Level I',
    category: 'Space',
    thumbnail: '🪐',
    questions: [
      { correctWord: 'Planet', options: [{ word: 'Planet', image: '🪐' }, { word: 'Moon', image: '🌙' }, { word: 'Sun', image: '☀️' }] },
      { correctWord: 'Rocket', options: [{ word: 'Plane', image: '✈️' }, { word: 'Rocket', image: '🚀' }, { word: 'Satellite', image: '🛰️' }] },
      { correctWord: 'Astronaut', options: [{ word: 'Pilot', image: '👨‍✈️' }, { word: 'Astronaut', image: '👨‍🚀' }, { word: 'Alien', image: '👽' }] },
      { correctWord: 'Stars', options: [{ word: 'Comet', image: '☄️' }, { word: 'Stars', image: '✨' }, { word: 'Galaxy', image: '🌀' }] },
      { correctWord: 'Mars', options: [{ word: 'Earth', image: '🌍' }, { word: 'Mars', image: '🔴' }, { word: 'Venus', image: '🟠' }] },
      { correctWord: 'Telescope', options: [{ word: 'Camera', image: '📷' }, { word: 'Telescope', image: '🔭' }, { word: 'Glasses', image: '👓' }] },
      { correctWord: 'UFO', options: [{ word: 'Balloon', image: '🎈' }, { word: 'UFO', image: '🛸' }, { word: 'Drone', image: '🚁' }] },
      { correctWord: 'Gravity', options: [{ word: 'Wind', image: '💨' }, { word: 'Gravity', image: '⬇️' }, { word: 'Light', image: '💡' }] },
      { correctWord: 'Void', options: [{ word: 'Black', image: '⬛' }, { word: 'Void', image: '🌌' }, { word: 'Deep', image: '🌊' }] },
      { correctWord: 'Orbit', options: [{ word: 'Orbit', image: '💫' }, { word: 'Spin', image: '🌀' }, { word: 'Circle', image: '⭕' }] }
    ]
  },
  {
    id: 'raz-j',
    name: '☀️ Level J',
    category: 'Daily',
    thumbnail: '🥪',
    questions: [
      { correctWord: 'Breakfast', options: [{ word: 'Lunch', image: '🍱' }, { word: 'Breakfast', image: '🍳' }, { word: 'Dinner', image: '🍲' }] },
      { correctWord: 'Brushing', options: [{ word: 'Washing', image: '🧼' }, { word: 'Brushing', image: '🪥' }, { word: 'Combing', image: '🪮' }] },
      { correctWord: 'Clothes', options: [{ word: 'Shoes', image: '👟' }, { word: 'Clothes', image: '👕' }, { word: 'Hat', image: '🧢' }] },
      { correctWord: 'Backpack', options: [{ word: 'Lunchbox', image: '🍱' }, { word: 'Backpack', image: '🎒' }, { word: 'Wallet', image: '👛' }] },
      { correctWord: 'Homework', options: [{ word: 'Reading', image: '📖' }, { word: 'Homework', image: '📝' }, { word: 'Drawing', image: '🎨' }] },
      { correctWord: 'Bathroom', options: [{ word: 'Kitchen', image: '🍳' }, { word: 'Bathroom', image: '🚽' }, { word: 'Bedroom', image: '🛏️' }] },
      { correctWord: 'Pajamas', options: [{ word: 'Sweater', image: '🧶' }, { word: 'Pajamas', image: '💤' }, { word: 'Shorts', image: '🩳' }] },
      { correctWord: 'Dinner', options: [{ word: 'Snack', image: '🍪' }, { word: 'Dinner', image: '🍽️' }, { word: 'Treat', image: '🍭' }] },
      { correctWord: 'Showering', options: [{ word: 'Swimming', image: '🏊' }, { word: 'Showering', image: '🚿' }, { word: 'Soaking', image: '🛁' }] },
      { correctWord: 'Family', options: [{ word: 'Friends', image: '🧑‍🤝‍🧑' }, { word: 'Family', image: '👨‍👩-👧' }, { word: 'Neighbors', image: '🏘️' }] }
    ]
  },
  {
    id: 'raz-k',
    name: '🏰 Level K',
    category: 'Fantasy',
    thumbnail: '🐉',
    questions: [
      { correctWord: 'Dragon', options: [{ word: 'Dino', image: '🦖' }, { word: 'Dragon', image: '🐉' }, { word: 'Monster', image: '👹' }] },
      { correctWord: 'Castle', options: [{ word: 'Tower', image: '🗼' }, { word: 'Castle', image: '🏰' }, { word: 'Palace', image: '🏛️' }] },
      { correctWord: 'Wizard', options: [{ word: 'King', image: '👑' }, { word: 'Wizard', image: '🧙' }, { word: 'Knight', image: '🛡️' }] },
      { correctWord: 'Magic', options: [{ word: 'Trick', image: '🪄' }, { word: 'Magic', image: '✨' }, { word: 'Sparkle', image: '❇️' }] },
      { correctWord: 'Unicorn', options: [{ word: 'Horse', image: '🐎' }, { word: 'Unicorn', image: '🦄' }, { word: 'Pony', image: '🐴' }] },
      { correctWord: 'Mermaid', options: [{ word: 'Fish', image: '🐟' }, { word: 'Mermaid', image: '🧜‍♀️' }, { word: 'Fairy', image: '🧚‍♀️' }] },
      { correctWord: 'Potion', options: [{ word: 'Juice', image: '🧃' }, { word: 'Potion', image: '🧪' }, { word: 'Bottle', image: '🍾' }] },
      { correctWord: 'Forest', options: [{ word: 'Woods', image: '🌲' }, { word: 'Forest', image: '🍄' }, { word: 'Island', image: '🏝️' }] },
      { correctWord: 'Hidden', options: [{ word: 'Found', image: '🔍' }, { word: 'Hidden', image: '🙈' }, { word: 'Locked', image: '🔒' }] },
      { correctWord: 'Treasure', options: [{ word: 'Gold', image: '💰' }, { word: 'Treasure', image: '💎' }, { word: 'Chest', image: '📦' }] }
    ]
  }
];

export const COLORS = {
  primary: '#ec4899', // pink-500
  secondary: '#8b5cf6', // violet-500
  accent: '#facc15', // yellow-400
  background: '#a5f3fc', // cyan-200
};

const toWordKey = (word: string) => word.trim().toLowerCase();

export const LEVEL_METADATA: LevelMeta[] = LEVELS.map(({ id, name, category, thumbnail }) => ({
  id,
  name,
  category,
  thumbnail,
}));

export const FALLBACK_WORD_BANKS: Record<string, WordEntry[]> = Object.fromEntries(
  LEVELS.map(level => {
    const wordsByKey = new Map<string, WordEntry>();

    level.questions.forEach(question => {
      question.options.forEach(option => {
        const word = toWordKey(option.word);
        if (!word || wordsByKey.has(word)) return;

        wordsByKey.set(word, {
          word,
          icon: option.image,
          category: level.category.toLowerCase(),
        });
      });
    });

    return [level.id, Array.from(wordsByKey.values())];
  })
) as Record<string, WordEntry[]>;
