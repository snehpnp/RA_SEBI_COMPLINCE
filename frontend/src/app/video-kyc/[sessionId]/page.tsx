import VideoKycClient from './VideoKycClient';

export const dynamicParams = false;

export function generateStaticParams() {
  return [
    { sessionId: 'session' }
  ];
}

export default function Page() {
  return <VideoKycClient />;
}
