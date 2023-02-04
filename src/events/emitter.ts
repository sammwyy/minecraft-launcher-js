import EventEmitter from 'events';
import TypedEmitter from 'typed-emitter';

import { DownloadTaskEnd } from './download-task-end';
import { DownloadTaskProgress } from './download-task-progress';
import { DownloadTaskStart } from './download-task-start';

export type EventType = {
  download_end: (event: DownloadTaskEnd) => void;
  download_start: (event: DownloadTaskStart) => void;
  download_progress: (event: DownloadTaskProgress) => void;
  stop: (stopCode: number) => void;
  stderr: (message: string) => void;
  stdout: (message: string) => void;
};

class Emitter extends (EventEmitter as new () => TypedEmitter<EventType>) {
  constructor() {
    super();
  }
}

export default Emitter;
