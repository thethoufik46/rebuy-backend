import { google } from "googleapis";
import fs from "fs";

const oauth2Client = new google.auth.OAuth2(
  process.env.YT_CLIENT_ID,
  process.env.YT_CLIENT_SECRET,
  process.env.YT_REDIRECT
);

oauth2Client.setCredentials({
  refresh_token: process.env.YT_REFRESH_TOKEN,
});

const youtube = google.youtube({
  version: "v3",
  auth: oauth2Client,
});

export const uploadToYouTube = async (file, title = "Car Video") => {
  try {
    const response = await youtube.videos.insert({
      part: "snippet,status",
      requestBody: {
        snippet: {
          title,
          description: "Car details video",
        },
        status: {
          privacyStatus: "unlisted", // public / private
        },
      },
      media: {
        body: fs.createReadStream(file.path),
      },
    });

    return `https://www.youtube.com/watch?v=${response.data.id}`;
  } catch (err) {
    console.log("YOUTUBE UPLOAD ERROR:", err.message);
    throw new Error("YouTube upload failed");
  }
};