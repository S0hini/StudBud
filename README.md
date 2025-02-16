

### **README.md**  

# 📚 StudBud – AI-Powered Academic Assistant  

An AI-powered platform designed to help students with their studies by providing **YouTube lecture suggestions**, **automated notes generation**, and **AI-driven quizzes** for enhanced learning.  

🔗 **GitHub Repository:** [StudBud](https://github.com/Sahnik0/StudBud)  

---

## 🚀 Features  

### 🔹 **1. YouTube Lecture Suggestions**  
- Users can upload their notes, and the platform will recommend **relevant YouTube videos** for learning.  

### 🔹 **2. Automated Notes Generation**  
- When a user provides a **YouTube video link**, the website will generate **text-based notes** using the **Gemini API**.  

### 🔹 **3. AI-Powered Quiz Creation**  
- Based on uploaded **notes or a video link**, the platform will generate **multiple-choice quizzes** to test understanding.  
- Users can specify the **number of questions**, and each question will have a **15-second time limit**.  

---

## 🔑 Authentication & Access Control  

- **Google Sign-In** using **Firebase Authentication**.  
- **Admin Access** is customizable – You can **add your email** to the admin list to gain access.  
- Admin privileges include:  
  - **Viewing platform statistics** 📊  
  - **Adding or removing credits from user accounts** 💰  
  - **Banning users** (prevents account creation with the same Google ID) ❌  

---

## 🏗️ Website Structure  

### **🔻 Sidebar Options**  

✅ **Get Notes** – Generates text-based notes using the **Gemini API**.  
✅ **Find a Lecture** – Provides **YouTube video suggestions** based on the topic.  
✅ **AI Tutor** – Offers **AI-powered academic assistance** using the **Gemini API**.  
✅ **Find Friends** – Displays **registered users** with a search function. Users can:  
   - **Send connection requests**  
   - **Invite friends for group quizzes**  
✅ **Leaderboard** – Displays two leaderboards:  
   - **Peers Leaderboard** – Ranks friends/connections based on credits.  
   - **Public Leaderboard** – Ranks all users based on credits.  
✅ **Earn Credits** – Users can **gain credits** by:  
   - Taking quizzes.  
   - **Challenging friends** to quizzes (winners earn credits, losers lose them).  
   - **Competing in group quizzes** (winner with the most correct answers wins total wagered credits).  

---

## 🏆 Leaderboards  

- **Peers Leaderboard** – Displays ranking among friends based on credits.  
- **Public Leaderboard** – Displays ranking of all users based on credits.  

---

## 📌 Navigation Bar  

🔹 **Credits** – Displays the user’s current credit balance.  
🔹 **User Profile** – Shows **profile details** and statistics.  

---

## 🔧 Tech Stack  

- **Frontend:** React (TypeScript, Vite)  
- **Backend:** Flask  
- **Authentication:** Firebase  
- **AI API:** Gemini API  

---

## 🎯 How to Contribute  

1. **Fork the repository**  
2. **Clone the repository**  
   ```sh
   git clone https://github.com/Sahnik0/StudBud.git
   ```
3. **Install dependencies**  
   ```sh
   npm install
   ```
4. **Start the development server**  
   ```sh
   npm run dev
   ```
5. **Submit a Pull Request** 🎉  

---

## 📜 License  

This project is **open-source** under the **MIT License**.  

---

## 👥 Contributors  

 

<table>
  <tr>
    <td align="center"><a href="https://github.com/Sahnik0"><img src="https://github.com/Sahnik0.png" width="100px;" alt=""/><br /><sub><b>Sahnik Biswas</b></sub></a></td>
    <td align="center"><a href="https://github.com/S0hini"><img src="https://github.com/S0hini.png" width="100px;" alt=""/><br /><sub><b>Sohini Das</b></sub></a></td>
  </tr>
</table>  

Want to contribute? **Fork the repository and make your first pull request!** 🚀  

---

💡 **Join the project and help build the future of AI-driven academic assistance!** 🚀  
```
