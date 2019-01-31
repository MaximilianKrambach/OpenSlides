import { Injectable } from '@angular/core';

import { OpenSlidesComponent } from 'app/openslides.component';
import { HttpService } from './http.service';
import { environment } from 'environments/environment.prod';
import { BehaviorSubject, Observable } from 'rxjs';

/**
 * This service provides the timeoffset to the server and a user of this service
 * can query the servertime.
 *
 * This service needs to be started with `startScheduler` which will update
 * the servertime frequently.
 */
@Injectable({
    providedIn: 'root'
})
export class ServertimeService extends OpenSlidesComponent {
    private static FAILURE_TIMEOUT = 30;
    private static NORMAL_TIMEOUT = 60 * 5;

    /**
     * The server offset in milliseconds
     */
    private serverOffsetSubject = new BehaviorSubject<number>(0);

    public constructor(private http: HttpService) {
        super();
    }

    /**
     * Starts the scheduler to sync with the server.
     */
    public startScheduler(): void {
        this.scheduleNextRefresh(0);
    }

    /**
     * Get an observable for the server offset.
     */
    public getServerOffsetObservable(): Observable<number> {
        return this.serverOffsetSubject.asObservable();
    }

    /**
     * Schedules the next sync with the server.
     *
     * @param seconds The timeout in seconds to the refresh.
     */
    private scheduleNextRefresh(seconds: number): void {
        setTimeout(async () => {
            let timeout = ServertimeService.NORMAL_TIMEOUT;
            try {
                await this.refreshServertime();
            } catch (e) {
                timeout = ServertimeService.FAILURE_TIMEOUT;
            }
            this.scheduleNextRefresh(timeout);
        }, 1000 * seconds);
    }

    /**
     * Queries the servertime and calculates the offset.
     */
    private async refreshServertime(): Promise<void> {
        // servertime is the time in seconds.
        const servertime = await this.http.get<number>(environment.urlPrefix + '/core/servertime/');
        // isNumber is deprecated: since node v4.0.0
        if (typeof servertime !== 'number') {
            throw new Error('The returned servertime is not a number');
        }
        this.serverOffsetSubject.next(Math.floor(Date.now() - servertime * 1000));
    }

    /**
     * Calculate the time of the server.
     */
    public getServertime(): number {
        return Date.now() - this.serverOffsetSubject.getValue();
    }
}
