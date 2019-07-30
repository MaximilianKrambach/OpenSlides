import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { MotionsRoutingModule } from './motions-routing.module';
import { SharedModule } from '../../shared/shared.module';

@NgModule({
    imports: [CommonModule, MotionsRoutingModule, SharedModule]
})
export class MotionsModule {}
