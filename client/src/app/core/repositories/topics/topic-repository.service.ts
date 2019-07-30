import { Injectable } from '@angular/core';

import { TranslateService } from '@ngx-translate/core';

import { CollectionStringMapperService } from 'app/core/core-services/collection-string-mapper.service';
import { DataSendService } from 'app/core/core-services/data-send.service';
import { DataStoreService } from 'app/core/core-services/data-store.service';
import { ViewModelStoreService } from 'app/core/core-services/view-model-store.service';
import { Topic } from 'app/shared/models/topics/topic';
import { ViewMediafile } from 'app/site/mediafiles/models/view-mediafile';
import { TopicTitleInformation, ViewTopic } from 'app/site/topics/models/view-topic';
import { BaseIsAgendaItemAndListOfSpeakersContentObjectRepository } from '../base-is-agenda-item-and-list-of-speakers-content-object-repository';
import { RelationDefinition } from '../base-repository';

const TopicRelations: RelationDefinition[] = [
    {
        type: 'M2M',
        ownIdKey: 'attachments_id',
        ownKey: 'attachments',
        foreignModel: ViewMediafile
    }
];

/**
 * Repository for topics
 */
@Injectable({
    providedIn: 'root'
})
export class TopicRepositoryService extends BaseIsAgendaItemAndListOfSpeakersContentObjectRepository<
    ViewTopic,
    Topic,
    TopicTitleInformation
> {
    /**
     * Constructor calls the parent constructor
     *
     * @param DS Access the DataStore
     * @param mapperService OpenSlides mapping service for collections
     * @param dataSend Access the DataSendService
     */
    public constructor(
        DS: DataStoreService,
        dataSend: DataSendService,
        mapperService: CollectionStringMapperService,
        viewModelStoreService: ViewModelStoreService,
        translate: TranslateService
    ) {
        super(DS, dataSend, mapperService, viewModelStoreService, translate, Topic, TopicRelations);
    }

    public getTitle = (titleInformation: TopicTitleInformation) => {
        if (titleInformation.agenda_item_number) {
            return titleInformation.agenda_item_number + ' · ' + titleInformation.title;
        } else {
            return titleInformation.title;
        }
    };

    public getAgendaListTitle = (titleInformation: TopicTitleInformation) => {
        // Do not append ' (Topic)' to the title.
        return this.getTitle(titleInformation);
    };

    public getAgendaSlideTitle = (titleInformation: TopicTitleInformation) => {
        // Do not append ' (Topic)' to the title.
        return this.getTitle(titleInformation);
    };

    public getVerboseName = (plural: boolean = false) => {
        return this.translate.instant(plural ? 'Topics' : 'Topic');
    };
}
