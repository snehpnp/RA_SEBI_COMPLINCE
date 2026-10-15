import VideoKycClient from './VideoKycClient';

export function generateStaticParams() {
  return [
    { sessionId: 'session' }
  ];
}

export default function Page() {
  return <VideoKycClient />;
}

