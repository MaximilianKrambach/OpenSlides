import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { Component, OnInit, ViewChild } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { TranslateService } from '@ngx-translate/core';

import { CanComponentDeactivate } from 'app/shared/utils/watch-sorting-tree.guard';
import { CategoryRepositoryService } from 'app/core/repositories/motions/category-repository.service';
import { MatSnackBar } from '@angular/material';
import { MotionRepositoryService } from 'app/core/repositories/motions/motion-repository.service';
import { PromptService } from 'app/core/ui-services/prompt.service';
import { SortingListComponent } from 'app/shared/components/sorting-list/sorting-list.component';
import { SortTreeViewComponent, SortTreeFilterOption } from 'app/site/base/sort-tree.component';
import { TagRepositoryService } from 'app/core/repositories/tags/tag-repository.service';
import { ViewCategory } from 'app/site/motions/models/view-category';
import { ViewMotion } from 'app/site/motions/models/view-motion';

/**
 * View for rearranging and renumbering the motions of a category. The {@link onNumberMotions}
 * method sends a request to the server to re-number the given motions in the order
 * as displayed in this view
 */
@Component({
    selector: 'os-category-sort',
    templateUrl: './category-sort.component.html',
    styleUrls: ['./category-sort.component.scss']
})
export class CategorySortComponent extends SortTreeViewComponent<ViewMotion> implements OnInit, CanComponentDeactivate {
    /**
     * The current category. Determined by the route
     */
    public category: ViewCategory;

    /**
     * A behaviorSubject emitting the currently asigned motions on change
     */
    public motionsSubject = new BehaviorSubject<ViewMotion[]>([]);

    /**
     * Counter indicating the amount of motions currently in the category
     */
    public motionsCount = 0;

    /**
     * Flag to define if the list has changed.
     */
    public hasChanged = false;

    /**
     * BehaviourSubject to get informed every time the filters change.
     */
    protected activeTagFilters: BehaviorSubject<number[]> = new BehaviorSubject<number[]>([]);
    public tagFilterOptions: SortTreeFilterOption[];
    public hasActiveTagFilter: boolean;

    /**
     * Copied array of the motions in this category
     */
    private motionsCopy: ViewMotion[] = [];

    /**
     * Array that contains the initial list of motions.
     * Necessary to reset the list.
     */
    private motionsBackup: ViewMotion[] = [];

    /**
     * @returns an observable for the {@link motionsSubject}
     */
    public get motionObservable(): Observable<ViewMotion[]> {
        return this.motionsSubject.asObservable();
    }

    /**
     * @returns the name and (if present) prefix of the category
     */
    public get categoryName(): string {
        if (!this.category) {
            return '';
        }
        return this.category.prefix ? `${this.category.name} (${this.category.prefix})` : this.category.name;
    }

    /**
     * The Sort Component
     */
    @ViewChild('sorter')
    public sortSelector: SortingListComponent;

    /**
     * Constructor. Calls parents
     *
     * @param title
     * @param translate
     * @param matSnackBar
     * @param promptService
     * @param repo
     * @param route
     * @param motionRepo
     */
    public constructor(
        title: Title,
        translate: TranslateService,
        matSnackBar: MatSnackBar,
        promptService: PromptService,
        private repo: CategoryRepositoryService,
        private route: ActivatedRoute,
        private motionRepo: MotionRepositoryService,
        private tagRepo: TagRepositoryService
    ) {
        super(title, translate, matSnackBar, promptService);
    }

    /**
     * Subscribes to the category and motions of this category.
     */
    public ngOnInit(): void {
        const category_id: number = +this.route.snapshot.params.id;
        this.repo.getViewModelObservable(category_id).subscribe(cat => {
            this.category = cat;
        });
        this.motionRepo.getViewModelListObservable().subscribe(motions => {
            const filtered = motions.filter(m => m.category_id === category_id);
            this.motionsBackup = [...filtered];
            this.motionsCount = filtered.length;
            if (this.motionsCopy.length === 0) {
                this.initializeList(filtered);
            } else {
                this.motionsSubject.next(this.handleMotionUpdates(filtered));
            }
        });
        this.subscriptions.push(
            this.tagRepo.getViewModelListBehaviorSubject().subscribe(tags => {
                if (tags && tags.length) {
                    this.tagFilterOptions = tags.map(tag => {
                        return {
                            label: tag.name,
                            id: tag.id,
                            state:
                                this.tagFilterOptions &&
                                this.tagFilterOptions.some(tagfilter => {
                                    return tagfilter.id === tag.id && tagfilter.state === true;
                                })
                        };
                    });
                    this.tagFilterOptions.push({
                        label: this.translate.instant('No tags'),
                        id: 0,
                        state:
                            this.tagFilterOptions &&
                            this.tagFilterOptions.some(tagfilter => {
                                return tagfilter.id === 0 && tagfilter.state === true;
                            })
                    });
                } else {
                    this.tagFilterOptions = [];
                }
            })
        );
        this.subscriptions.push(
            this.activeTagFilters.subscribe((value: number[]) => this.onSubscribedFilterChange(value))
        );
    }

    /**
     * Function to (re-)set the current list of motions.
     *
     * @param motions An array containing the new motions.
     */
    private initializeList(motions: ViewMotion[]): void {
        motions.sort((a, b) => a.category_weight - b.category_weight);
        this.motionsSubject.next(motions);
        this.motionsCopy = motions;
    }

    /**
     * Triggers a (re-)numbering of the motions after a configmarion dialog
     *
     * @param category
     */
    public async onNumberMotions(): Promise<void> {
        if (this.sortSelector) {
            const title = this.translate.instant('Are you sure you want to renumber all motions of this category?');
            const content = this.category.getTitle();
            if (await this.promptService.open(title, content)) {
                const sortedMotionIds = this.sortSelector.array.map(selectable => selectable.id);
                await this.repo
                    .numberMotionsInCategory(this.category.category, sortedMotionIds)
                    .then(null, this.raiseError);
            }
        }
    }

    /**
     * Listener for the sorting event in the `sorting-list`.
     *
     * @param motions ViewMotion[]: The sorted array of motions.
     */
    public onListUpdate(motions: ViewMotion[]): void {
        this.hasChanged = true;
        this.motionsCopy = motions;
    }

    /**
     * Resets the current list.
     */
    public async onCancel(): Promise<void> {
        if (await this.canDeactivate()) {
            this.motionsSubject.next([]);
            this.initializeList(this.motionsBackup);
            this.hasChanged = false;
        }
    }

    /**
     * This function sends the changed list.
     * Only an array containing ids from the motions will be sent.
     */
    public async sendUpdate(): Promise<void> {
        const title = this.translate.instant('Do you really want to save your changes?');
        if (await this.promptService.open(title, null)) {
            const ids = this.motionsCopy.map(motion => motion.id);
            this.repo.sortMotionsInCategory(this.category.category, ids);
            this.hasChanged = false;
        }
    }

    /**
     * This function handles the incoming motions after the user sorted them previously.
     *
     * @param nextMotions are the motions that are received from the server.
     *
     * @returns An array containing the new motions or not the removed motions.
     */
    private handleMotionUpdates(nextMotions: ViewMotion[]): ViewMotion[] {
        const copy = this.motionsCopy;
        if (nextMotions.length > copy.length) {
            for (const motion of nextMotions) {
                if (!this.motionsCopy.includes(motion)) {
                    copy.push(motion);
                }
            }
        } else if (nextMotions.length < copy.length) {
            for (const motion of copy) {
                if (!nextMotions.includes(motion)) {
                    copy.splice(copy.indexOf(motion), 1);
                }
            }
        } else {
            for (const motion of copy) {
                if (!nextMotions.includes(motion)) {
                    const updatedMotion = nextMotions.find(theMotion => theMotion.id === motion.id);
                    copy.splice(copy.indexOf(motion), 1, updatedMotion);
                }
            }
        }
        return copy;
    }

    /**
     * Function to open a prompt dialog,
     * so the user will be warned if he has made changes and not saved them.
     *
     * @returns The result from the prompt dialog.
     */
    public async canDeactivate(): Promise<boolean> {
        if (this.hasChanged) {
            const title = this.translate.instant('Do you really want to exit this page?');
            const content = this.translate.instant('You made changes.');
            return await this.promptService.open(title, content);
        }
        return true;
    }

    /**
     * Helper to trigger an update of the filter itself and the information about
     * the state of filters
     *
     * @param model the property/model the filter is for
     * @param value
     */
    private onSubscribedFilterChange(value: number[]): void {
        this.hasActiveTagFilter = value.length === 0 ? false : true;
        this.hasActiveFilter = this.hasActiveTagFilter;
        this.tagFilterOptions.forEach(filterOption => {
            filterOption.state = value && value.includes(filterOption.id);
        });
        this.changeFilter.emit(
            (item: ViewMotion): boolean => {
                if (!value.length) {
                    return false;
                }
                if (!item.category_id && value.includes(0)) {
                    return false;
                }
                return !value.includes(item.category_id);
            }
        );
    }

    /**
     * Function to set the active filters to null.
     */
    public resetFilters(): void {
        this.activeTagFilters.next([]);
    }

    public getCurrentTagFilterNames(): string {
        return this.tagFilterOptions
            .filter(f => f.state === true)
            .map(f => f.label)
            .join(', ');
    }

    public onFilterChange(filter: number): void {
        const value = this.activeTagFilters.value;
        if (!value.includes(filter)) {
            value.push(filter);
        } else {
            value.splice(value.indexOf(filter), 1);
        }
        this.activeTagFilters.next(value);
    }
}
