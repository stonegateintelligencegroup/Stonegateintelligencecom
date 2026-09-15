import { useRef } from 'react';
import type { SyntheticEvent } from 'react';
import { trackEvent } from '@/lib/analytics';

const VIDEO_TITLE = 'Stonegate Intelligence Group introduction';
const VIDEO_FILE = '/media/stonegate-introduction.mp4';
const MILESTONES = [25, 50, 75] as const;

const videoParameters = {
  video_title: VIDEO_TITLE,
  video_file: VIDEO_FILE,
};

export function useHTML5VideoAnalytics() {
  const started = useRef(false);
  const completed = useRef(false);
  const sentMilestones = useRef(new Set<number>());

  const beginPlaybackSession = () => {
    started.current = false;
    completed.current = false;
    sentMilestones.current.clear();
  };

  const onPlay = (event: SyntheticEvent<HTMLVideoElement>) => {
    const video = event.currentTarget;

    if (completed.current && video.currentTime < 1) {
      beginPlaybackSession();
    }

    if (!started.current) {
      started.current = trackEvent('video_start', videoParameters);
    }
  };

  const onTimeUpdate = (event: SyntheticEvent<HTMLVideoElement>) => {
    const video = event.currentTarget;
    if (!Number.isFinite(video.duration) || video.duration <= 0) return;

    if (!started.current) {
      started.current = trackEvent('video_start', videoParameters);
    }

    const percentWatched = (video.currentTime / video.duration) * 100;
    for (const milestone of MILESTONES) {
      if (percentWatched < milestone || sentMilestones.current.has(milestone)) continue;

      if (
        trackEvent('video_progress', {
          ...videoParameters,
          percent_watched: milestone,
        })
      ) {
        sentMilestones.current.add(milestone);
      }
    }
  };

  const onEnded = () => {
    if (completed.current) return;

    if (trackEvent('video_complete', { ...videoParameters, percent_watched: 100 })) {
      completed.current = true;
    }
  };

  return { onPlay, onTimeUpdate, onEnded };
}
