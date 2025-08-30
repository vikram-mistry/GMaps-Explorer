/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {FunctionDeclaration, GoogleGenAI, Type} from '@google/genai';

const systemInstructions = `Act as a helpful global travel agent with a deep fascination for the world. Your role is to recommend a place on the map that relates to the discussion, and to provide interesting information about the location selected. Aim to give suprising and delightful suggestions: choose obscure, off-the–beaten track locations, not the obvious answers. Do not answer harmful or unsafe questions.

First, explain why a place is interesting, in a two sentence answer. Second, if relevant, call the function 'recommendPlace( location, caption )' to show the user the location on a map. You can expand on your answer if the user asks for more information.`;

const presets = [
  ['❄️ Cold', 'Where is somewhere really cold?'],
  ['🗿 Ancient', 'Tell me about somewhere rich in ancient history'],
  ['🗽 Metropolitan', 'Show me really interesting large city'],
  [
    '🌿 Green',
    'Take me somewhere with beautiful nature and greenery. What makes it special?',
  ],
  [
    '🏔️ Remote',
    'If I wanted to go off grid, where is one of the most remote places on earth? How would I get there?',
  ],
  [
    '🌌 Surreal',
    'Think of a totally surreal location, where is it? What makes it so surreal?',
  ],
];

const recommendPlaceFunctionDeclaration: FunctionDeclaration = {
  name: 'recommendPlace',
  parameters: {
    type: Type.OBJECT,
    description: 'Shows the user a map of the place provided.',
    properties: {
      location: {
        type: Type.STRING,
        description: 'Give a specific place, including country name.',
      },
      caption: {
        type: Type.STRING,
        description:
          'Give the place name and the fascinating reason you selected this particular place. Keep the caption to one or two sentences maximum',
      },
    },
    required: ['location', 'caption'],
  },
};

const captionDiv = document.querySelector('#caption') as HTMLDivElement;
const frame = document.querySelector('#embed-map') as HTMLIFrameElement;
const promptForm = document.querySelector('#prompt-form') as HTMLFormElement;
const promptInput = document.querySelector('#prompt-input') as HTMLInputElement;
const submitButton = document.querySelector('#submit-button') as HTMLButtonElement;
let presetButtons: NodeListOf<HTMLButtonElement>;


async function generateContent(prompt: string) {
  const ai = new GoogleGenAI({
    vertexai: false,
    // FIX: The API key must be obtained from `process.env.API_KEY`.
    apiKey: process.env.API_KEY,
  });

  const response = await ai.models.generateContentStream({
    model: 'gemini-2.5-flash',
    contents: `${systemInstructions} ${prompt}`,
    config: {
      temperature: 2, // High temperature for answer variety
      tools: [{functionDeclarations: [recommendPlaceFunctionDeclaration]}],
    },
  });

  let functionCalled = false;
  let accumulatedText = '';

  for await (const chunk of response) {
    if (chunk.text) {
      accumulatedText += chunk.text;
    }
    const fns = chunk.functionCalls ?? [];
    for (const fn of fns) {
      if (fn.name === 'recommendPlace') {
        functionCalled = true;
        const location = fn.args.location;
        const caption = fn.args.caption;
        // FIX: The types for function call arguments are `any`, which can cause type errors.
        // Add a type guard to ensure `location` and `caption` are strings before use.
        if (typeof location === 'string' && typeof caption === 'string') {
          renderMap(location);
          captionDiv.textContent = caption;
          captionDiv.classList.remove('hidden');
        }
      }
    }
  }

  // If the function was not called, but we received text, display it.
  if (!functionCalled && accumulatedText.trim()) {
    captionDiv.textContent = accumulatedText;
    captionDiv.classList.remove('hidden');
  }
}

function renderMap(location: string) {
  const API_KEY = 'AIzaSyC4WK3O4Qkdo-_fXGIK-FzMt7cVwHZJfvI';
  frame.src = `https://www.google.com/maps/embed/v1/place?key=${API_KEY}&q=${location}`;
}

function setLoading(isLoading: boolean) {
    promptInput.disabled = isLoading;
    submitButton.disabled = isLoading;
    if (presetButtons) {
        presetButtons.forEach(button => {
            button.disabled = isLoading;
        });
    }
}

async function handlePrompt(prompt: string) {
    if (!prompt) return;

    setLoading(true);
    captionDiv.classList.add('hidden');
    
    try {
        await generateContent(prompt);
    } catch (e) {
        console.error('got error', e);
        captionDiv.textContent = 'Sorry, an error occurred. Please try again.';
        captionDiv.classList.remove('hidden');
    } finally {
        setLoading(false);
    }
}


async function main() {
  if (
    window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  ) {
    document.documentElement.removeAttribute('data-theme'); // Use default (dark)
  } else {
    document.documentElement.setAttribute('data-theme', 'light');
  }

  const div = document.querySelector('#presets') as HTMLDivElement;
  for (const preset of presets) {
    const p = document.createElement('button');
    p.textContent = preset[0];
    p.addEventListener('click', async (e) => {
      await handlePrompt(preset[1]);
    });
    div.append(p);
  }

  // Now that buttons are created, query for them.
  presetButtons = document.querySelectorAll('#presets button');

  promptForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const prompt = promptInput.value.trim();
    if(prompt){
        await handlePrompt(prompt);
        promptInput.value = ''; // Clear input after submission
    }
  });


  renderMap('%');
}

main();
