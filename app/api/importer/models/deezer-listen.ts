// models/deezer-listen.ts
export type columnMap = Record<string, string>;

export const DEEZER_COLUMN_MAP: columnMap = {
  "song title": "title",
  artist: "artist",
  "album title": "album",
  "listening time": "listening_time",
  date: "date",
  "platform name": "platform_name",
  "platform model": "platform_model",
  "ip address": "ip_address",
  isrc: "isrc",
};

export type DeezerListen = {
  title: string;
  artist: string;
  album?: string;
  listening_time: any;
  date: any;
  platform_name?: string;
  platform_model?: string;
  ip_address?: string;
  isrc?: string;
};
