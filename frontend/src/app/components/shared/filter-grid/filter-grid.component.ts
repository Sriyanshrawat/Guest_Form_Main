import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import {
  CellClickedEvent,
  ColDef,
  GridApi,
  GridReadyEvent,
} from 'ag-grid-community';

export interface FilterGridColumn {
  header: string;
  field: string;
  minWidth?: number;
}
export interface FilterGridAction {
  id: string;
  label: string;
  icon: string;
  danger?: boolean;
}

@Component({
  selector: 'app-filter-grid',
  standalone: true,
  imports: [CommonModule, AgGridAngular],
  template: `<ag-grid-angular
      class="ag-theme-quartz app-filter-grid"
      [rowData]="rows"
      [columnDefs]="columnDefs"
      [defaultColDef]="defaultColDef"
      [animateRows]="true"
      (gridReady)="ready($event)"
      (filterChanged)="updateCount()"
      (cellClicked)="clicked($event)"
    ></ag-grid-angular>
    <div class="filter-grid-footer">
      Showing {{ displayedCount }} of {{ rows.length }} records
    </div>`,
  styles: [
    `
      :host {
        display: block;
      }
      .app-filter-grid {
        height: min(500px, 60vh);
        width: 100%;
      }
      .filter-grid-footer {
        padding: 0.75rem 1.25rem;
        border-top: 1px solid var(--rule, #ddd);
        color: var(--ink-soft, #5d6470);
        font-size: 0.84rem;
      }
    `,
  ],
})
export class FilterGridComponent {
  @Input() rows: any[] = [];
  @Input() columns: FilterGridColumn[] = [];
  @Input() actions: FilterGridAction[] = [];
  @Input() wideActions = false;
  @Output() action = new EventEmitter<{ id: string; row: any }>();
  displayedCount = 0;
  private api?: GridApi;
  defaultColDef: ColDef = {
    filter: 'agTextColumnFilter',
    floatingFilter: true,
    sortable: true,
    resizable: true,
    flex: 1,
    minWidth: 135,
  };
  get columnDefs(): ColDef[] {
    const fields = this.columns.map((c) => ({
      field: c.field,
      headerName: c.header,
      minWidth: c.minWidth ?? 140,
    }));
    if (!this.actions.length) return fields;
    return [
      ...fields,
      {
        colId: '__actions',
        headerName: 'Actions',
        filter: false,
        floatingFilter: false,
        sortable: false,
        minWidth: this.wideActions ? 230 : 150,
        maxWidth: this.wideActions ? 260 : 190,
        cellRenderer: () =>
          `<div class="filter-grid-actions">${this.actions.map((a) => `<button class="filter-grid-action${a.danger ? ' danger' : ''}" type="button" data-grid-action="${a.id}" title="${a.label}"><i class="bi ${a.icon}"></i><span>${a.label}</span></button>`).join('')}</div>`,
      },
    ];
  }
  ready(event: GridReadyEvent): void {
    this.api = event.api;
    this.updateCount();
  }
  updateCount(): void {
    this.displayedCount = this.api?.getDisplayedRowCount() ?? this.rows.length;
  }
  clicked(event: CellClickedEvent): void {
    const id = (
      event.event?.target as HTMLElement | null
    )?.closest<HTMLButtonElement>('[data-grid-action]')?.dataset['gridAction'];
    if (id && event.data) this.action.emit({ id, row: event.data });
  }
}
