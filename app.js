const path = require("path");
const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "userData.db");
let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("server is running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DBError: {e.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

// 1 register

app.post("/register", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const selectUserQuery = `
    SELECT *
    FROM user
    WHERE username = '${username}';`;
  const dbUser = await db.get(selectUserQuery);

  if (dbUser === undefined) {
    const registerUserQuery = `
        INSERT INTO
            user (username, name, password, gender, location)
            VALUES (
                '${username}', '${name}', '${hashedPassword}',
                '${gender}', '${location}'
            );
        `;
    if (password.length > 4) {
      await db.run(registerUserQuery);
      response.status(200);
      response.send("User created successfully");
    } else {
      response.status(400);
      response.send("Password is too short");
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

// 2 login

app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `
        SELECT *
        FROM user
        WHERE username = '${username}';
    `;
  const dbUser = await db.get(selectUserQuery);

  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
      response.status(200);
      response.send("Login success!");
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

// 3

app.put("/change-password", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;
  const selectUserQuery = `
        SELECT *
        FROM user
        WHERE username = '${username}';
    `;
  const dbResponse = await db.get(selectUserQuery);
  if (dbResponse !== undefined) {
    const isPasswordMatched = await bcrypt.compare(
      oldPassword,
      dbResponse.password
    );
    if (isPasswordMatched === true) {
      if (newPassword.length > 4) {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const updatePasswordQuery = `
                UPDATE user
                SET 
                    password = '${hashedPassword}'
                
                WHERE username = '${username}';
            `;
        const user = await db.run(updatePasswordQuery);
        response.status(200);
        response.send("Password updated");
      } else {
        response.status(400);
        response.send("Password is too short");
      }
    } else {
      response.status(400);
      response.send("Invalid current password");
    }
  } else {
    response.status(400);
    response.send("Invalid user");
  }
});

module.exports = app;
