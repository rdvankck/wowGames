import gsap from "gsap";
import { Container, Sprite, Text, TextStyle, Graphics } from "pixi.js";

const GAME_WIDTH = 550;
const GAME_HEIGHT = 800;

const LETTERS = ["G", "O", "D", "L"];
const LETTER_RADIUS = 92;
const LETTER_CENTER = { x: GAME_WIDTH / 2, y: 550 };
const WORDS = ["GOLD", "GOD", "LOG", "DOG"];

export default class Game extends Container {
  constructor() {
    super();
    this.init();
  }

  init() {
    // Background
    const bg = Sprite.from("bg");
    bg.width = GAME_WIDTH;
    bg.height = GAME_HEIGHT;
    this.addChild(bg);

    // Word box positions
    const boxPositions = [
      { x: 120, y: 100 }, { x: 200, y: 100 }, { x: 280, y: 100 }, { x: 360, y: 100 },
      { x: 120, y: 180 }, { x: 280, y: 180 },
      { x: 120, y: 260 }, { x: 200, y: 260 }, { x: 280, y: 260 },
    ];

    // Mapping of boxes to words and letters
    this.wordBoxMappings = {
      "GOLD": [
        { letter: "G", boxIndex: 0 },
        { letter: "O", boxIndex: 1 },
        { letter: "L", boxIndex: 2 },
        { letter: "D", boxIndex: 3 },
      ],
      "GOD": [
        { letter: "G", boxIndex: 0 }, // Shared with GOLD
        { letter: "O", boxIndex: 4 },
        { letter: "D", boxIndex: 6 },
      ],
      "LOG": [
        { letter: "L", boxIndex: 2 }, // Shared with GOLD
        { letter: "O", boxIndex: 5 },
        { letter: "G", boxIndex: 8 },
      ],
      "DOG": [
        { letter: "D", boxIndex: 6 },
        { letter: "O", boxIndex: 7 },
        { letter: "G", boxIndex: 8 },
      ],
    };

    this.wordBoxes = [];
    

    // Create word boxes
    for (let i = 0; i < boxPositions.length; i++) {
      const box = new Container();
      const rect = Sprite.from("rect");
      rect.width = 60;
      rect.height = 60;
      rect.anchor.set(0.5);
      box.addChild(rect);
      box.x = boxPositions[i].x;
      box.y = boxPositions[i].y;
      this.addChild(box);
      this.wordBoxes.push(box);
    }

    // Create big circle background
    const bigCircle = new Graphics();
    bigCircle.beginFill(0xCCCCCC, 0.3); // Semi-transparent white
    bigCircle.drawCircle(LETTER_CENTER.x, LETTER_CENTER.y, LETTER_RADIUS + 60);
    bigCircle.endFill();
    bigCircle.lineStyle(4, 0xFF9900, 0.7); // Orange border
    bigCircle.drawCircle(LETTER_CENTER.x, LETTER_CENTER.y, LETTER_RADIUS + 60);
    this.addChild(bigCircle);

    // Create letters (without white boxes)
    this.shuffledLetters = [...LETTERS];
    this.letterSprites = [];

    for (let i = 0; i < LETTERS.length; i++) {
      const angle = (i / LETTERS.length) * Math.PI * 2 - Math.PI / 2;
      const x = LETTER_CENTER.x + Math.cos(angle) * LETTER_RADIUS;
      const y = LETTER_CENTER.y + Math.sin(angle) * LETTER_RADIUS;

      const holder = new Container();
      holder.x = x;
      holder.y = y;

      const letter = new Text(LETTERS[i], new TextStyle({
        fontFamily: "Arial",
        fontSize: 36,
        fill: "#FF9900",  // Orange color for letters
        fontWeight: "bold"
      }));
      letter.anchor.set(0.5);

      holder.addChild(letter);
      this.addChild(holder);
      this.letterSprites.push({ holder, letter });
    }

    // Shuffle button
    const shuffleBtn = Sprite.from("suffle");
    shuffleBtn.anchor.set(0.5);
    shuffleBtn.x = LETTER_CENTER.x;
    shuffleBtn.y = LETTER_CENTER.y;
    shuffleBtn.scale.set(0.1);
    shuffleBtn.interactive = true;
    shuffleBtn.buttonMode = true;
    shuffleBtn.on("pointerdown", () => {
      this.shuffleLetters();
    });
    this.addChild(shuffleBtn);

    // Center word box
    this.wordBox = new Graphics();
    this.addChild(this.wordBox);

    // Word text
    this.wordText = new Text("", new TextStyle({
      fontFamily: "Arial",
      fontSize: 36,
      fill: "#FF9900",  // Orange color
      fontWeight: "bold",
      stroke: "#fff",
      strokeThickness: 4
    }));
    this.wordText.anchor.set(0.5);
    this.wordText.x = GAME_WIDTH / 2;
    this.wordText.y = 340;
    this.addChild(this.wordText);

    // PLAY NOW button
    const playNowBtn = new Container();
    const playRect = Sprite.from("rect");
    playRect.width = 220;
    playRect.height = 50;
    playRect.anchor.set(0.5);
    playRect.tint = 0x222222;
    playNowBtn.addChild(playRect);

    const playText = new Text("PLAY NOW!", new TextStyle({
      fontFamily: "Arial",
      fontSize: 32,
      fill: "#ffffff",
      fontWeight: "bold"
    }));
    playText.anchor.set(0.5);
    playNowBtn.addChild(playText);
    playNowBtn.x = GAME_WIDTH / 2;
    playNowBtn.y = GAME_HEIGHT - 60;
    this.addChild(playNowBtn);

    // Button animation
    gsap.to(playNowBtn.scale, {
      x: 1.1,
      y: 1.1,
      duration: 0.6,
      yoyo: true,
      repeat: -1,
      ease: "power1.inOut"
    });

    this.selectedLetters = [];
    this.foundWords = new Set();
    this.lineGraphics = new Graphics();
    this.addChild(this.lineGraphics);

    // Drag selection flag
    this.isDragging = false;

    // Set up interactivity
    this.interactive = true;
    this.on("pointerdown", (e) => {
      this.isDragging = true;
      this.handlePointer(e);
    });
    this.on("pointermove", (e) => {
      if (this.isDragging) this.handlePointer(e);
    });
    this.on("pointerup", () => {
      this.isDragging = false;
      this.checkWordAndReset();
    });
    this.on("pointerupoutside", () => {
      this.isDragging = false;
      this.checkWordAndReset();
    });

    this.shuffleLetters();
  }

  handlePointer(e) {
    const pos = e.data.getLocalPosition(this);
    for (let i = 0; i < this.letterSprites.length; i++) {
      const letterHolder = this.letterSprites[i].holder;
      const dx = pos.x - letterHolder.x;
      const dy = pos.y - letterHolder.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < LETTER_RADIUS * 0.6) { // If close enough, select
        if (!this.selectedLetters.includes(i)) {
          this.addLetter(i);
        }
        break;
      }
    }
  }

  addLetter(idx) {
    if (this.selectedLetters.includes(idx)) return;
    this.selectedLetters.push(idx);
    this.updateWordAndLine();
    this.updateWordBox();

    
  }

  updateWordBox() {
    this.wordBox.clear();
    this.wordBox.lineStyle(4, 0xff9900);
    this.wordBox.beginFill(0xffffff, 0.8);
    this.wordBox.drawRoundedRect(this.wordText.x - 110, this.wordText.y - 40, 220, 80, 20);
    this.wordBox.endFill();
  }

  clearWordBox() {
    this.wordBox.clear();
  }

  resetSelection() {
    this.selectedLetters = [];
    this.updateWordAndLine();
    this.clearWordBox();
  }

  fillWordBoxes(word) {
    const mappings = this.wordBoxMappings[word];
    if (!mappings) return; // Should not happen if WORDS array is correct

    for (const map of mappings) {
      const box = this.wordBoxes[map.boxIndex];
      const targetLetter = map.letter;

      // Clear any existing letter in the box before adding the new one
      // This is important for shared boxes to ensure only the correct letter for the current word is shown
      for (let i = box.children.length - 1; i >= 0; i--) {
        if (box.children[i] instanceof Text) {
          box.removeChildAt(i);
        }
      }

      const style = new TextStyle({
        fontFamily: "Arial",
        fontSize: 36,
        fill: "#FF9900",
        fontWeight: "bold"
      });

      const letter = new Text(targetLetter, style);
      letter.anchor.set(0.5);
      box.addChild(letter);

      // Change the tint of the box's background rect to indicate it's filled
      const rect = box.children[0]; // Assuming the rect is the first child
      if (rect instanceof Sprite) {
        rect.tint = 0x99FF99; // Green tint for filled boxes
      }
    }
  }

  showGameComplete() {
    const msg = new Text("Congratulations! You found all words!", new TextStyle({
      fontFamily: "Arial",
      fontSize: 32,
      fill: "#00bb00",
      fontWeight: "bold",
      stroke: "#fff",
      strokeThickness: 4
    }));
    msg.anchor.set(0.5);
    msg.x = GAME_WIDTH / 2;
    msg.y = GAME_HEIGHT / 2;
    this.addChild(msg);
  }

  shuffleLetters() {
    for (let i = this.shuffledLetters.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.shuffledLetters[i], this.shuffledLetters[j]] = [this.shuffledLetters[j], this.shuffledLetters[i]];
    }

    for (let i = 0; i < this.letterSprites.length; i++) {
      const angle = (i / this.shuffledLetters.length) * Math.PI * 2 - Math.PI / 2;
      const x = LETTER_CENTER.x + Math.cos(angle) * LETTER_RADIUS;
      const y = LETTER_CENTER.y + Math.sin(angle) * LETTER_RADIUS;
      const { holder, letter } = this.letterSprites[i];
      holder.x = x;
      holder.y = y;
      letter.text = this.shuffledLetters[i];
    }

    this.resetSelection();
  }

  updateWordAndLine() {
    const word = this.selectedLetters.map(i => this.shuffledLetters[i]).join("");
    this.wordText.text = word;

    this.lineGraphics.clear();
    if (this.selectedLetters.length > 1) {
      this.lineGraphics.lineStyle(6, 0xff9900, 0.7);
      for (let i = 0; i < this.selectedLetters.length - 1; i++) {
        const idxA = this.selectedLetters[i];
        const idxB = this.selectedLetters[i + 1];
        const posA = this.letterSprites[idxA].holder;
        const posB = this.letterSprites[idxB].holder;
        this.lineGraphics.moveTo(posA.x, posA.y);
        this.lineGraphics.lineTo(posB.x, posB.y);
      }
    }
  }

  checkWordAndReset() {
    const word = this.selectedLetters.map(i => this.shuffledLetters[i]).join("");
    if (WORDS.includes(word) && !this.foundWords.has(word)) {
      this.foundWords.add(word);
      this.fillWordBoxes(word);
      if (this.foundWords.size === WORDS.length) {
        this.showGameComplete();
      }
    }
    this.resetSelection();
  }
}