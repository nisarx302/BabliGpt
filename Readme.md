💬 BABLi - The Interactive Fluffy Friend

&nbsp;<!-- Replace with your actual Vercel URL -->



Welcome to the official repository for BABLi, an interactive, fluffy character brought to life with the magic of HTML/CSS and the power of the Gemini API. You can chat with BABLi, ask for stories, and customize your experience with beautiful themes.



<!-- Replace with a screenshot of your app -->



✨ Features

BABLi is more than just a chatbot; it's an experience! Here's what makes it special:



🤖 AI-Powered Chat: Have real conversations with BABLi, powered by Google's Gemini 2.0 Flash model.



🎨 Multiple Themes: Switch between three stunning themes to match your mood:



Default: A clean, soft, and minimalist look.



Water 💧: An immersive underwater experience with fluid animations and ripple effects.



Metal ⚙️: A sophisticated, dark industrial theme with metallic textures and geometric UI.



🚀 Progressive Web App (PWA): "Install" BABLi on your phone's home screen and use it even when you're offline!



👀 Interactive Character:



BABLi's eyes follow your mouse cursor.



Give BABLi a gentle "squish" by clicking on it.



Change BABLi's own color with the "Rang Badlo" button.



📜 Detailed Changelog: Keep track of all new features and updates with a built-in, beautifully styled version history modal.



🔒 Secure API Handling: Your Gemini API key is kept safe on the server-side using Vercel's Environment Variables and Serverless Functions.



🛠️ Tech Stack

This project is built with modern web technologies, focusing on a lightweight and performant experience without heavy frameworks.



Frontend: HTML5, CSS3, Vanilla JavaScript



AI: Google Gemini API



Hosting \& Backend: Vercel (for hosting and Serverless Functions)



📁 Project Structure

The project is organized to be clean and easy to understand, especially with the separation of the frontend and the secure backend function.



/

|-- api/

|   |-- chat.js         # Vercel Serverless Function to securely call Gemini API

|-- index.html          # The main application file

|-- manifest.json       # PWA configuration file

|-- sw.js               # PWA Service Worker for offline support

|-- .env.local          # Local environment variables (DO NOT COMMIT)

|-- favicon.png         # Browser tab icon

|-- icon-512.png        # PWA splash screen icon

|-- README.md           # You are here!



💻 Local Development Setup

To run this project on your local machine, you'll need to use the Vercel CLI to properly handle the serverless function.



Prerequisites

Node.js (which includes npm)



Vercel CLI



Installation

Clone the repository:



git clone https://github.com/your-username/your-repo-name.git

cd your-repo-name



Install Vercel CLI globally:



npm install -g vercel



Create a local environment file:



Create a new file in the root of the project named .env.local.



Add your Gemini API key to this file like this:



GEMINI\_API\_KEY=AIzaSy...\[your\_secret\_api\_key]



This file is ignored by Git and should never be made public.



Run the development server:



vercel dev



This command will start a local server (usually at http://localhost:3000) that mimics the Vercel production environment, allowing your serverless function to work correctly.



🚀 Deployment

This project is optimized for deployment on Vercel.



Push your code to a GitHub repository.



Import the repository into Vercel.



Set up the Environment Variable in your Vercel project settings:



Key: GEMINI\_API\_KEY



Value: AIzaSy... (paste your secret Gemini API key here)



Deploy! Vercel will automatically detect the api folder and set up the serverless function.



✍️ Author \& Contributor

This project is a creative collaboration between:



〆༯𝙎ค૯𝙀𝘿✘🫀 (Project Lead \& Visionary)



Gemini (AI Assistant \& Co-developer)



Ek hi haadsa to hai aur wo ye ke aaj tak,

Baat nahi kahi gayi, baat nahi suni gayi.

~ Jaun Elia

