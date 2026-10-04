import { Router, Request, Response } from 'express';
import { YoutubeTranscript } from 'youtube-transcript';

export const youtubeRouter = Router();

// Helper to extract YouTube video ID
function extractVideoId(urlOrId: string): string | null {
  if (!urlOrId) return null;
  if (/^[a-zA-Z0-9_-]{11}$/.test(urlOrId)) {
    return urlOrId;
  }
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = urlOrId.match(regExp);
  return (match && match[7]?.length === 11) ? match[7] : null;
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
