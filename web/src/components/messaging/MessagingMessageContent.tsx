'use client';

import { FiExternalLink, FiVideo } from 'react-icons/fi';
import { getVideoMeetingUrls } from './messagingVideo.util';

type Props = {
  content: string;
  attachmentUrls?: string[];
  linkClassName?: string;
};

export default function MessagingMessageContent({ content, attachmentUrls, linkClassName }: Props) {
  const videoUrls = getVideoMeetingUrls(content, attachmentUrls);
  const nonVideoAttachments = (attachmentUrls ?? []).filter((url) => !videoUrls.includes(url));

  return (
    <>
      <p className="whitespace-pre-wrap">{content}</p>
      {videoUrls.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {videoUrls.map((url) => (
            <a
              key={url}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium underline-offset-2 hover:underline ${linkClassName ?? 'text-emerald-700 bg-emerald-50 border border-emerald-100'}`}
              onClick={(event) => event.stopPropagation()}
            >
              <FiVideo className="w-3.5 h-3.5 shrink-0" />
              Rejoindre la visio
              <FiExternalLink className="w-3 h-3 shrink-0 opacity-70" />
            </a>
          ))}
        </div>
      )}
      {nonVideoAttachments.length > 0 && (
        <ul className="mt-2 text-xs space-y-1">
          {nonVideoAttachments.map((url) => (
            <li key={url}>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className={`underline break-all ${linkClassName ?? 'text-emerald-700'}`}
                onClick={(event) => event.stopPropagation()}
              >
                {url}
              </a>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
