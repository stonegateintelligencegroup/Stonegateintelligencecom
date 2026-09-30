import { useEffect, useRef } from 'react';
import type { SyntheticEvent } from 'react';
import { useCookieConsent } from '@/context/CookieConsentContext';
import { trackEvent } from '@/lib/analytics';

const VIDEO_NAME = 'Stonegate Intelligence Group introduction';
const VIDEO_FILE = '/media/stonegate-introduction.mp4';
const MILESTONES = [25, 50, 75] as const;

function getVideoParameters(videoPercent: number) {
  return {
    video_name: VIDEO_NAME,
    video_title: VIDEO_NAME,
    video_file: VIDEO_FILE,
    video_url: new URL(VIDEO_FILE, window.location.origin).href,
    video_percent: videoPercent,
    page_location: window.location.href,
    page_path: window.location.pathname + window.location.search,
  };
}

export function useHTML5VideoAnalytics() {
  const { status } = useCookieConsent();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const impressionSent = useRef(false);
  const started = useRef(false);
  const completed = useRef(false);
  const sentMilestones = useRef(new Set<number>());

  useEffect(() => {
    if (status !== 'accepted' || impressionSent.current) return;

    const video = videoRef.current;
    if (!video) return;

    const recordImpression = () => {
      if (impressionSent.current) return;
      impressionSent.current = trackEvent('video_impression', getVideoParameters(0));
    };

    if (typeof IntersectionObserver === 'undefined') {
      const rect = video.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) recordImpression();
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && entry.intersectionRatio >= 0.5) {
          recordImpression();
          if (impressionSent.current) observer.disconnect();
        }
      },
      { threshold: 0.5 },
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, [status]);

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
      started.current = trackEvent('video_start', getVideoParameters(0));
    }
  };

  const onTimeUpdate = (event: SyntheticEvent<HTMLVideoElement>) => {
    const video = event.currentTarget;
    if (!Number.isFinite(video.duration) || video.duration <= 0) return;

    if (!started.current) {
      started.current = trackEvent('video_start', getVideoParameters(0));
    }

    const percentWatched = (video.currentTime / video.duration) * 100;
    for (const milestone of MILESTONES) {
      if (percentWatched < milestone || sentMilestones.current.has(milestone)) continue;

      if (
        trackEvent('video_progress', {
          ...getVideoParameters(milestone),
          percent_watched: milestone,
        })
      ) {
        sentMilestones.current.add(milestone);
      }
    }
  };

  const onEnded = () => {
    if (completed.current) return;

    if (
      trackEvent('video_complete', {
        ...getVideoParameters(100),
        percent_watched: 100,
      })
    ) {
      completed.current = true;
    }
  };

  return { videoRef, onPlay, onTimeUpdate, onEnded };
}
