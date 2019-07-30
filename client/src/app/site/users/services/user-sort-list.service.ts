import { Injectable } from '@angular/core';

import { TranslateService } from '@ngx-translate/core';

import { StorageService } from 'app/core/core-services/storage.service';
import { BaseSortListService, OsSortingDefinition, OsSortingOption } from 'app/core/ui-services/base-sort-list.service';
import { ViewUser } from '../models/view-user';

/**
 * Sorting service for the user list
 */
@Injectable({
    providedIn: 'root'
})
export class UserSortListService extends BaseSortListService<ViewUser> {
    /**
     * Define the sort options
     */
    public sortOptions: OsSortingOption<ViewUser>[] = [
        { property: 'first_name', label: 'Given name' },
        { property: 'last_name', label: 'Surname' },
        { property: 'is_present', label: 'Presence' },
        { property: 'is_active', label: 'Is active' },
        { property: 'is_committee', label: 'Is committee' },
        { property: 'number', label: 'Participant number' },
        { property: 'structure_level', label: 'Structure level' },
        { property: 'comment' }
        // TODO email send?
    ];

    /**
     * Constructor.
     *
     * @param translate required by parent
     * @param store requires by parent
     */
    public constructor(translate: TranslateService, store: StorageService) {
        super('User', translate, store);
    }

    /**
     * Required by parent
     *
     * @returns the default sorting strategy
     */
    public async getDefaultDefinition(): Promise<OsSortingDefinition<ViewUser>> {
        return {
            sortProperty: 'first_name',
            sortAscending: true
        };
    }
}
