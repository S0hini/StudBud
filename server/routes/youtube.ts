import { Router, Request, Response } from 'express';
import { YoutubeTranscript } from 'youtube-transcript';
import dotenv from 'dotenv';

export const youtubeRouter = Router();

// Helper to extract YouTube video ID
function extractVideoId(urlOrId: string): string | null {
  if (!urlOrId) return null;
  const trimmed = urlOrId.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }
  const regExp = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?.*v=|embed\/|v\/|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = trimmed.match(regExp);
  return match ? match[1] : null;
}

// POST /api/youtube/transcript
youtubeRouter.post('/transcript', async (req: Request, res: Response) => {
  try {
    const { videoUrl, videoId: rawVideoId } = req.body;
    const target = rawVideoId || videoUrl;

    if (!target) {
      return res.status(400).json({ error: 'Please provide a videoUrl or videoId' });
    }

    const videoId = extractVideoId(target);
    if (!videoId) {
      return res.status(400).json({ error: 'Invalid YouTube URL or Video ID' });
    }

    try {
      let transcriptData;
      let language = 'en';

      // 1. Try fetching English transcript first
      try {
        transcriptData = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'en' });
      } catch {
        // 2. Fallback to any default transcript available
        transcriptData = await YoutubeTranscript.fetchTranscript(videoId);
        language = 'auto';
      }
      
      if (!transcriptData || transcriptData.length === 0) {
        return res.status(404).json({
          error: 'No transcript found for this video',
          videoId
        });
      }

      const fullText = transcriptData.map((item) => item.text).join(' ');
      const totalDuration = transcriptData[transcriptData.length - 1]?.offset || 0;

      return res.json({
        success: true,
        videoId,
        language,
        transcript: fullText,
        segments: transcriptData,
        durationSeconds: totalDuration
      });
    } catch (transcriptError: any) {
      console.warn(`[YouTube] Could not fetch transcript for ${videoId}:`, transcriptError?.message);
      return res.status(422).json({
        success: false,
        error: transcriptError?.message || 'Transcripts are disabled or unavailable for this video.',
        videoId
      });
    }
  } catch (err: any) {
    console.error('[YouTube] Server error in transcript route:', err);
    return res.status(500).json({ error: 'Failed to process YouTube transcript request' });
  }
});

// POST /api/youtube/search
youtubeRouter.post('/search', async (req: Request, res: Response) => {
  try {
    dotenv.config();
    const { query, subject, topic } = req.body;
    const searchQuery = (query || `${subject || ''} ${topic || ''} lecture`).trim();

    if (!searchQuery) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const apiKey = (
      (req.headers['x-youtube-key'] as string) ||
      process.env.VITE_YOUTUBE_API_KEY ||
      process.env.YOUTUBE_API_KEY ||
      ''
    ).trim();

    if (apiKey) {
      try {
        const ytRes = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=8&q=${encodeURIComponent(searchQuery)}&type=video&key=${apiKey}`
        );

        if (ytRes.ok) {
          const data = await ytRes.json();
          if (data.items && data.items.length > 0) {
            const results = data.items.map((item: any) => ({
              id: item.id?.videoId,
              title: item.snippet.title,
              description: item.snippet.description,
              thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url,
              channelName: item.snippet.channelTitle,
              url: `https://www.youtube.com/watch?v=${item.id?.videoId}`,
              publishedAt: item.snippet.publishedAt
            }));

            return res.json({
              success: true,
              query: searchQuery,
              results
            });
          }
        }
      } catch (ytErr) {
        console.warn('[YouTube Search] YouTube API call failed:', ytErr);
      }
    }

    return res.status(404).json({
      success: false,
      message: 'YouTube API key not configured or no results returned'
    });
  } catch (err: any) {
    console.error('[YouTube Search] Error:', err);
    return res.status(500).json({ error: 'Failed to search YouTube' });
  }
});
