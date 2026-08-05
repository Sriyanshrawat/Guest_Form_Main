import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { SchoolBoardService } from '../../services/school-board.service';
import { SchoolService } from '../../services/school.service';
import { ClassesService } from '../../services/classes.service';
import { StreamsService } from '../../services/streams.service';
import { SpecializationService } from '../../services/specialization.service';
import { StudentService } from '../../services/student.service';
import { SchoolBoard } from '../../models/school-board.model';
import { School } from '../../models/school.model';
import { ClassRecord } from '../../models/classes.model';
import { StreamRecord } from '../../models/streams.model';
import { SpecializationRecord } from '../../models/specialization.model';
import { Student } from '../../models/student.model';

type MasterMetric = 'boards' | 'schools' | 'classes' | 'streams' | 'specializations' | 'students';
type ChartPeriod = 'days' | 'weeks' | 'months';

type ChartBucket = { label: string; count: number; items: string[]; };

type ReportRow = {
  title: string;
  subtitle: string;
  metric: string;
  count: number;
  extra: string;
};

type ChartKind = 'bar' | 'line';

type ChartSlice = { label: string; value: number; color: string; };

@Component({
  selector: 'app-master-report',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './master-report.component.html',
  styleUrls: ['./master-report.component.css']
})
export class MasterReportComponent implements OnInit {
  private readonly schoolBoardService = inject(SchoolBoardService);
  private readonly schoolService = inject(SchoolService);
  private readonly classesService = inject(ClassesService);
  private readonly streamsService = inject(StreamsService);
  private readonly specializationService = inject(SpecializationService);
  private readonly studentService = inject(StudentService);

  loading = true;
  errorMessage = '';

  boards: SchoolBoard[] = [];
  schools: School[] = [];
  classes: ClassRecord[] = [];
  streams: StreamRecord[] = [];
  specializations: SpecializationRecord[] = [];
  students: Student[] = [];

  searchText = '';
  filterBoard = '';
  filterSchool = '';
  filterSession = '';
  filterClass = '';
  filterStream = '';

  selectedMetric: MasterMetric = 'schools';
  selectedPeriod: ChartPeriod = 'months';
  selectedChartKind: ChartKind = 'bar';

  chartData: ChartBucket[] = [];
  addedThisPeriod = 0;
  chartMax = 0;
  chartMid = 0;
  chartGrowth = 0;
  lineSeries: number[] = [];
  pieSlices: ChartSlice[] = [];
  historyRows: { label: string; value: number; change: number; trend: 'up' | 'down'; }[] = [];

  activityRows: { icon: string; label: string; detail: string; when: string; }[] = [];
  reportRows: ReportRow[] = [];
  boardBreakdown: { name: string; value: number; pct: number; }[] = [];

  readonly metricLabels: Record<MasterMetric, string> = {
    boards: 'Boards',
    schools: 'Schools',
    classes: 'Classes',
    streams: 'Streams',
    specializations: 'Specializations',
    students: 'Students'
  };

  ngOnInit(): void {
    this.loadMasterData();
  }

  loadMasterData(): void {
    this.loading = true;
    this.errorMessage = '';

    forkJoin({
      boards: this.schoolBoardService.getSchoolBoards(),
      schools: this.schoolService.getSchools(),
      classes: this.classesService.getClasses(),
      streams: this.streamsService.getStreams(),
      specializations: this.specializationService.getSpecializations(),
      students: this.studentService.getStudents(true),
    }).subscribe({
      next: ({ boards, schools, classes, streams, specializations, students }) => {
        this.boards = boards;
        this.schools = schools;
        this.classes = classes;
        this.streams = streams;
        this.specializations = specializations;
        this.students = students;
        this.refreshReport();
        this.loading = false;
      },
      error: (error) => {
        console.error(error);
        this.errorMessage = 'Unable to load master report data. Please refresh.';
        this.loading = false;
      }
    });
  }

  get boardOptions(): string[] {
    return [...new Set(this.boards.map(b => b.universityName || b.name || 'Unknown'))]
      .filter(Boolean)
      .sort();
  }

  get schoolOptions(): string[] {
    const filtered = this.filterBoard
      ? this.schools.filter(s => s.schoolBoardName === this.filterBoard)
      : this.schools;
    return [...new Set(filtered.map(s => s.name))].sort();
  }

  get sessionOptions(): string[] {
    const filtered = this.filterBoard || this.filterSchool
      ? this.classes.filter(c => (!this.filterBoard || c.schoolName && this.schools.some(s => s.name === c.schoolName && s.schoolBoardName === this.filterBoard)) && (!this.filterSchool || c.schoolName === this.filterSchool))
      : this.classes;
    return [...new Set(filtered.map(c => c.sessionName || 'Unknown'))].filter(Boolean).sort();
  }

  get classOptions(): string[] {
    const filtered = this.classes.filter(c =>
      (!this.filterBoard || (c.schoolName && this.schools.some(s => s.name === c.schoolName && s.schoolBoardName === this.filterBoard))) &&
      (!this.filterSchool || c.schoolName === this.filterSchool) &&
      (!this.filterSession || c.sessionName === this.filterSession)
    );
    return [...new Set(filtered.map(c => `${c.name} ${c.section}`))].sort();
  }

  get streamOptions(): string[] {
    const filtered = this.streams.filter(s =>
      (!this.filterBoard || (s.schoolName && this.schools.some(school => school.name === s.schoolName && school.schoolBoardName === this.filterBoard))) &&
      (!this.filterSchool || s.schoolName === this.filterSchool) &&
      (!this.filterClass || `${s.className} ${s.classSection}` === this.filterClass)
    );
    return [...new Set(filtered.map(s => s.name))].sort();
  }

  clearFilters(): void {
    this.searchText = '';
    this.filterBoard = '';
    this.filterSchool = '';
    this.filterSession = '';
    this.filterClass = '';
    this.filterStream = '';
    this.refreshReport();
  }

  onFilterChange(): void {
    this.refreshReport();
  }

  changeMetric(metric: MasterMetric): void {
    this.selectedMetric = metric;
    this.refreshReport();
  }

  changePeriod(period: ChartPeriod): void {
    this.selectedPeriod = period;
    this.refreshReport();
  }

  private refreshReport(): void {
    this.buildChart();
    this.buildReportRows();
    this.buildActivityRows();
    this.buildBoardBreakdown();
  }

  private filteredEntities(): {
    boards: SchoolBoard[];
    schools: School[];
    classes: ClassRecord[];
    streams: StreamRecord[];
    specializations: SpecializationRecord[];
    students: Student[];
  } {
    const boards = [...this.boards];
    const schools = this.schools.filter(s =>
      (!this.filterBoard || s.schoolBoardName === this.filterBoard) &&
      (!this.searchText || s.name.toLowerCase().includes(this.searchText.toLowerCase()))
    );
    const classes = this.classes.filter(c =>
      (!this.filterBoard || (c.schoolName && this.schools.some(s => s.name === c.schoolName && s.schoolBoardName === this.filterBoard))) &&
      (!this.filterSchool || c.schoolName === this.filterSchool) &&
      (!this.filterSession || c.sessionName === this.filterSession) &&
      (!this.searchText || c.name.toLowerCase().includes(this.searchText.toLowerCase()) || (c.schoolName || '').toLowerCase().includes(this.searchText.toLowerCase()))
    );
    const streams = this.streams.filter(s =>
      (!this.filterBoard || (s.schoolName && this.schools.some(school => school.name === s.schoolName && school.schoolBoardName === this.filterBoard))) &&
      (!this.filterSchool || s.schoolName === this.filterSchool) &&
      (!this.filterClass || `${s.className} ${s.classSection}` === this.filterClass) &&
      (!this.filterStream || s.name === this.filterStream) &&
      (!this.searchText || s.name.toLowerCase().includes(this.searchText.toLowerCase()) || (s.schoolName || '').toLowerCase().includes(this.searchText.toLowerCase()))
    );
    const specializations = this.specializations.filter(sp =>
      (!this.filterBoard || (sp.schoolName && this.schools.some(school => school.name === sp.schoolName && school.schoolBoardName === this.filterBoard))) &&
      (!this.filterSchool || sp.schoolName === this.filterSchool) &&
      (!this.filterClass || `${sp.className} ${sp.classSection}` === this.filterClass) &&
      (!this.filterStream || sp.streamName === this.filterStream) &&
      (!this.searchText || sp.name.toLowerCase().includes(this.searchText.toLowerCase()) || (sp.schoolName || '').toLowerCase().includes(this.searchText.toLowerCase()))
    );

    const students = this.students.filter(st =>
      (!this.filterBoard || st.boardName === this.filterBoard) &&
      (!this.filterSchool || st.schoolName === this.filterSchool) &&
      (!this.filterClass || `${st.className} ${st.classSection}` === this.filterClass) &&
      (!this.searchText || `${st.firstName} ${st.lastName}`.toLowerCase().includes(this.searchText.toLowerCase()) ||
        (st.email || '').toLowerCase().includes(this.searchText.toLowerCase()) ||
        (st.schoolName || '').toLowerCase().includes(this.searchText.toLowerCase()) ||
        (st.className || '').toLowerCase().includes(this.searchText.toLowerCase()))
    );

    return { boards, schools, classes, streams, specializations, students };
  }

  private buildChart(): void {
    const { boards, schools, classes, streams, specializations, students } = this.filteredEntities();
    const data = {
      boards: boards.map(item => ({ insertedDate: item.insertedDate, label: item.universityName || item.name || 'Board', active: item.deletedDate ? false : true, deletedDate: item.deletedDate })),
      schools: schools.map(item => ({ insertedDate: item.insertedDate, label: item.name, active: item.isActive === false ? false : true, isActive: item.isActive })),
      classes: classes.map(item => ({ insertedDate: item.insertedDate, label: `${item.name} ${item.section}`, active: item.isActive === false ? false : true, isActive: item.isActive })),
      streams: streams.map(item => ({ insertedDate: item.insertedDate, label: item.name, active: item.isActive === false ? false : true, isActive: item.isActive })),
      specializations: specializations.map(item => ({ insertedDate: item.insertedDate, label: item.name, active: item.isActive === false ? false : true, isActive: item.isActive })),
      students: students.map(item => ({
        insertedDate: item.createdAt,
        label: `${item.firstName} ${item.lastName}`,
        active: item.isActive !== false,
        deletedDate: item.deletedDate,
        isActive: item.isActive,
        createdAt: item.createdAt
      })),
    } as Record<MasterMetric, { insertedDate?: string; label: string; active: boolean; deletedDate?: string; isActive?: boolean; createdAt?: string; }[]>;

    const buckets = this.createBuckets(this.selectedPeriod);
    data[this.selectedMetric].forEach(item => {
      if (!item.insertedDate) return;
      const date = this.parseDate(item.insertedDate);
      const bucket = buckets.find(b => date >= b.start && date < b.end);
      if (bucket) {
        bucket.count += 1;
        bucket.items.push(item.label);
      }
    });

    this.chartData = buckets.map(b => ({ label: b.label, count: b.count, items: b.items }));
    this.addedThisPeriod = this.chartData.reduce((sum, item) => sum + item.count, 0);
    this.chartMax = Math.max(...this.chartData.map(b => b.count), 1);
    this.chartMid = Math.ceil(this.chartMax / 2);
    const midpoint = Math.floor(this.chartData.length / 2);
    const first = this.chartData.slice(0, midpoint).reduce((sum, item) => sum + item.count, 0);
    const second = this.chartData.slice(midpoint).reduce((sum, item) => sum + item.count, 0);
    this.chartGrowth = first ? Math.round(((second - first) / first) * 100) : second ? 100 : 0;

    this.lineSeries = this.chartData.map(bucket => bucket.count);
    const activeCount = data[this.selectedMetric].filter(item => item.active).length;
    const inactiveCount = data[this.selectedMetric].length - activeCount;
    this.pieSlices = [
      { label: 'Active', value: activeCount, color: '#16a34a' },
      { label: 'Inactive', value: inactiveCount, color: '#dc2626' },
    ];
    this.buildHistoryRows(this.selectedMetric);
  }

  private createBuckets(period: ChartPeriod): { start: Date; end: Date; label: string; count: number; items: string[]; }[] {
    const now = new Date();
    const buckets = [] as { start: Date; end: Date; label: string; count: number; items: string[]; }[];

    if (period === 'months') {
      for (let monthOffset = 5; monthOffset >= 0; monthOffset--) {
        const start = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
        const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
        buckets.push({ start, end, label: start.toLocaleString('en-US', { month: 'short', year: 'numeric' }), count: 0, items: [] });
      }
    } else {
      const anchor = new Date(now);
      anchor.setHours(0, 0, 0, 0);
      if (period === 'weeks') {
        anchor.setDate(anchor.getDate() - anchor.getDay());
      }
      const rangeCount = period === 'weeks' ? 8 : 7;
      for (let index = rangeCount - 1; index >= 0; index--) {
        const start = new Date(anchor);
        start.setDate(anchor.getDate() - (index * 7));
        const end = new Date(start);
        end.setDate(start.getDate() + (period === 'weeks' ? 7 : 1));
        buckets.push({ start, end, label: period === 'weeks' ? this.formatWeekLabel(start, end) : start.toLocaleString('en-US', { weekday: 'short', day: 'numeric' }), count: 0, items: [] });
      }
    }
    return buckets;
  }

  private formatWeekLabel(start: Date, end: Date): string {
    const last = new Date(end);
    last.setDate(last.getDate() - 1);
    const startLabel = start.toLocaleString('en-US', { month: 'short', day: 'numeric' });
    const endLabel = last.toLocaleString('en-US', { month: 'short', day: 'numeric' });
    return `${startLabel}–${endLabel}`;
  }

  private parseDate(value: string): Date {
    return new Date(value.endsWith('Z') ? value : value + 'Z');
  }

  private buildReportRows(): void {
    const { boards, schools, classes, streams, specializations, students } = this.filteredEntities();
    const search = this.searchText.trim().toLowerCase();
    switch (this.selectedMetric) {
      case 'boards':
        this.reportRows = boards.map(board => ({
          title: board.universityName || board.name || 'Board',
          subtitle: `${this.schools.filter(s => s.schoolBoardName === (board.universityName || board.name)).length} schools`,
          metric: 'Board',
          count: this.schools.filter(s => s.schoolBoardName === (board.universityName || board.name)).length,
          extra: board.insertedDate ? new Date(board.insertedDate).toLocaleDateString() : 'N/A'
        })).sort((a, b) => b.count - a.count);
        break;
      case 'schools':
        this.reportRows = schools.map(school => ({
          title: school.name,
          subtitle: school.schoolBoardName || 'Board unknown',
          metric: 'School',
          count: this.classes.filter(c => c.schoolName === school.name).length,
          extra: school.insertedDate ? new Date(school.insertedDate).toLocaleDateString() : 'N/A'
        })).sort((a, b) => b.count - a.count);
        break;
      case 'classes':
        this.reportRows = classes.map(cls => ({
          title: `${cls.name} ${cls.section}`,
          subtitle: `${cls.schoolName || 'School'} · ${cls.sessionName || 'Session'}`,
          metric: 'Class',
          count: this.streams.filter(s => s.classId === cls.id).length,
          extra: cls.insertedDate ? new Date(cls.insertedDate).toLocaleDateString() : 'N/A'
        })).sort((a, b) => b.count - a.count);
        break;
      case 'streams':
        this.reportRows = streams.map(stream => ({
          title: stream.name,
          subtitle: `${stream.schoolName || 'School'} · ${stream.className || 'Class'}`,
          metric: 'Stream',
          count: this.specializations.filter(sp => sp.streamName === stream.name && sp.className === stream.className).length,
          extra: stream.insertedDate ? new Date(stream.insertedDate).toLocaleDateString() : 'N/A'
        })).sort((a, b) => b.count - a.count);
        break;
      case 'students':
        this.reportRows = students.map(student => ({
          title: `${student.firstName} ${student.lastName}`,
          subtitle: `${student.schoolName || 'School'} · ${student.className || 'Class'}${student.classSection ? ' ' + student.classSection : ''}`,
          metric: 'Student',
          count: 1,
          extra: student.createdAt ? new Date(student.createdAt).toLocaleDateString() : 'N/A'
        })).sort((a, b) => a.title.localeCompare(b.title));
        break;
      default:
        this.reportRows = specializations.map(sp => ({
          title: sp.name,
          subtitle: `${sp.streamName || 'No stream'} · ${sp.schoolName || 'School'}`,
          metric: 'Specialization',
          count: 1,
          extra: sp.insertedDate ? new Date(sp.insertedDate).toLocaleDateString() : 'N/A'
        })).sort((a, b) => a.title.localeCompare(b.title));
    }

    if (search) {
      this.reportRows = this.reportRows.filter(row =>
        row.title.toLowerCase().includes(search) ||
        row.subtitle.toLowerCase().includes(search)
      );
    }
  }

  private buildActivityRows(): void {
    const { boards, schools, classes, streams, specializations, students } = this.filteredEntities();
    const items = [
      ...boards.slice(-6).reverse().map(board => ({ icon: 'bi-bank', label: 'Board event', detail: `${board.universityName || board.name} ${board.deletedDate ? 'removed' : 'added'}`, when: board.insertedDate ? new Date(board.insertedDate).toLocaleDateString() : 'Unknown' })),
      ...schools.slice(-6).reverse().map(school => ({ icon: 'bi-building-add', label: 'School event', detail: `${school.name} ${school.isActive === false ? 'removed' : 'added'}`, when: school.insertedDate ? new Date(school.insertedDate).toLocaleDateString() : 'Unknown' })),
      ...classes.slice(-6).reverse().map(cls => ({ icon: 'bi-backpack4', label: 'Class event', detail: `${cls.name} ${cls.section} ${cls.isActive === false ? 'removed' : 'added'}`, when: cls.insertedDate ? new Date(cls.insertedDate).toLocaleDateString() : 'Unknown' })),
      ...streams.slice(-6).reverse().map(stream => ({ icon: 'bi-signpost-split', label: 'Stream event', detail: `${stream.name} ${stream.isActive === false ? 'removed' : 'added'}`, when: stream.insertedDate ? new Date(stream.insertedDate).toLocaleDateString() : 'Unknown' })),
      ...specializations.slice(-6).reverse().map(spec => ({ icon: 'bi-bookmark-star', label: 'Specialization event', detail: `${spec.name} ${spec.isActive === false ? 'removed' : 'added'}`, when: spec.insertedDate ? new Date(spec.insertedDate).toLocaleDateString() : 'Unknown' })),
      ...students.slice(-6).reverse().map(student => ({
        icon: 'bi-person-circle',
        label: 'Student event',
        detail: `${student.firstName} ${student.lastName} ${student.isActive === false ? 'removed' : 'added'}`,
        when: student.isActive === false
          ? student.deletedDate ? new Date(student.deletedDate).toLocaleDateString() : 'Unknown'
          : student.createdAt ? new Date(student.createdAt).toLocaleDateString() : 'Unknown'
      })),
    ];

    this.activityRows = items.slice(0, 8);
  }

  private buildBoardBreakdown(): void {
    const schoolCount = this.schools.length;
    const counts = this.boardOptions.map(board => {
      const value = this.schools.filter(s => s.schoolBoardName === board).length;
      return { name: board, value, pct: schoolCount ? Math.max(4, Math.round((value / schoolCount) * 100)) : 0 };
    }).sort((a, b) => b.value - a.value);
    this.boardBreakdown = counts;
  }

  private buildHistoryRows(metric: MasterMetric): void {
    const { boards, schools, classes, streams, specializations, students } = this.filteredEntities();
    const items = {
      boards: boards,
      schools: schools,
      classes: classes,
      streams: streams,
      specializations: specializations,
      students: students,
    } as Record<MasterMetric, Array<{ insertedDate?: string; deletedDate?: string; createdAt?: string; isActive?: boolean }>>;

    const latest = [...items[metric]].sort((a, b) => {
      const aDate = a.deletedDate ? this.parseDate(a.deletedDate) : a.insertedDate ? this.parseDate(a.insertedDate) : a.createdAt ? this.parseDate(a.createdAt) : new Date(0);
      const bDate = b.deletedDate ? this.parseDate(b.deletedDate) : b.insertedDate ? this.parseDate(b.insertedDate) : b.createdAt ? this.parseDate(b.createdAt) : new Date(0);
      return bDate.getTime() - aDate.getTime();
    }).slice(0, 6);

    this.historyRows = latest.map(item => {
      const created = item.insertedDate ? this.parseDate(item.insertedDate).toLocaleDateString() : item.createdAt ? this.parseDate(item.createdAt).toLocaleDateString() : 'Unknown';
      const removed = item.deletedDate ? this.parseDate(item.deletedDate).toLocaleDateString() : (item.isActive === false ? 'Inactive' : null);
      const value = removed ? -1 : 1;
      return {
        label: removed ? (item.deletedDate ? `Deleted on ${removed}` : `Inactive since ${created}`) : `Created on ${created}`,
        value: value,
        change: value,
        trend: value > 0 ? 'up' : 'down'
      };
    });
  }

  getSelectedCount(): number {
    const { boards, schools, classes, streams, specializations, students } = this.filteredEntities();
    return {
      boards: boards.length,
      schools: schools.length,
      classes: classes.length,
      streams: streams.length,
      specializations: specializations.length,
      students: students.length,
    }[this.selectedMetric];
  }

  getDeletionCount(): number {
    const { boards, schools, classes, streams, specializations, students } = this.filteredEntities();
    const records = {
      boards: boards,
      schools: schools,
      classes: classes,
      streams: streams,
      specializations: specializations,
      students: students,
    }[this.selectedMetric] as Array<{ deletedDate?: string; isActive?: boolean }>;
    return records.filter(item => !!item.deletedDate || item.isActive === false).length;
  }

  linePoint(value: number): number {
    return this.chartMax ? Math.round((value / this.chartMax) * 100) : 0;
  }

  exportPdf(): void {
    import('jspdf').then(({ jsPDF }) =>
      import('jspdf-autotable').then((mod) => {
        const autoTable = mod.default;
        const data = this.buildExportData();
        const wide = data.headers.length > 6;
        const doc = new jsPDF({ orientation: wide ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' });
        const pageWidth = doc.internal.pageSize.getWidth();
        doc.setFontSize(16);
        doc.text(data.title, 14, 18);
        doc.setFontSize(9);
        doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, 25);
        doc.text(`Total: ${this.getSelectedCount()} | Added this period: ${this.addedThisPeriod} | Removed: ${this.getDeletionCount()} | Trend: ${this.chartGrowth}%`, 14, 30);
        autoTable(doc, {
          head: [data.headers],
          body: data.rows,
          startY: 34,
          margin: { left: 10, right: 10 },
          styles: {
            fontSize: wide ? 6 : 8,
            cellPadding: wide ? 1.2 : 2.5,
            overflow: 'linebreak',
            cellWidth: 'wrap',
            halign: 'left',
            valign: 'middle'
          },
          headStyles: { fillColor: [150, 112, 47], textColor: 255 },
          columnStyles: wide ? {
            0: { cellWidth: Math.max(30, pageWidth * 0.11) },
            1: { cellWidth: Math.max(25, pageWidth * 0.09) },
            2: { cellWidth: 16 },
            3: { cellWidth: 22 },
            4: { cellWidth: 30 },
            5: { cellWidth: 24 }
          } : undefined,
          tableWidth: 'auto',
          theme: 'striped'
        });
        doc.save(`${this.metricLabels[this.selectedMetric].toLowerCase()}-report.pdf`);
      })
    );
  }

  exportExcel(): void {
    import('xlsx').then((XLSX) => {
      const data = this.buildExportData();
      const ws = XLSX.utils.aoa_to_sheet([data.headers, ...data.rows]);
      ws['!cols'] = data.headers.map(() => ({ wch: 22 }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, this.metricLabels[this.selectedMetric]);
      XLSX.writeFile(wb, `${this.metricLabels[this.selectedMetric].toLowerCase()}-report.xlsx`);
    });
  }

  private buildExportData(): { title: string; headers: string[]; rows: (string | number)[][]; } {
    const { boards, schools, classes, streams, specializations, students } = this.filteredEntities();
    const fmtDate = (value?: string) => value ? new Date(value).toLocaleDateString() : 'N/A';
    const status = (isActive?: boolean) => (isActive === false ? 'Inactive' : 'Active');

    switch (this.selectedMetric) {
      case 'boards':
        return {
          title: 'Boards Report',
          headers: ['Board Name', 'Status', 'Inserted Date', 'Inserted By', 'Updated Date', 'Updated By', 'Deleted Date', 'Schools Count'],
          rows: boards.map(b => {
            const boardName = b.universityName || b.name || 'Unknown';
            return [
              boardName,
              status(b.isActive),
              fmtDate(b.insertedDate),
              b.insertedBy || 'N/A',
              fmtDate(b.updatedDate),
              b.updatedBy || 'N/A',
              b.deletedDate ? new Date(b.deletedDate).toLocaleDateString() : 'N/A',
              this.schools.filter(s => s.schoolBoardName === boardName).length,
            ];
          }),
        };
      case 'schools':
        return {
          title: 'Schools Report',
          headers: ['School Name', 'Board', 'Status', 'Inserted Date', 'Classes Count', 'Students Count'],
          rows: schools.map(s => [
            s.name,
            s.schoolBoardName || 'N/A',
            status(s.isActive),
            fmtDate(s.insertedDate),
            this.classes.filter(c => c.schoolName === s.name).length,
            this.students.filter(st => st.schoolName === s.name).length,
          ]),
        };
      case 'classes':
        return {
          title: 'Classes Report',
          headers: ['Class', 'Section', 'School', 'Session', 'Status', 'Inserted Date', 'Streams Count', 'Specializations Count', 'Students Count'],
          rows: classes.map(c => [
            c.name,
            c.section,
            c.schoolName || 'N/A',
            c.sessionName || 'N/A',
            status(c.isActive),
            fmtDate(c.insertedDate),
            this.streams.filter(s => s.classId === c.id).length,
            this.specializations.filter(sp => sp.classId === c.id).length,
            this.students.filter(st => st.classId === c.id).length,
          ]),
        };
      case 'streams':
        return {
          title: 'Streams Report',
          headers: ['Stream Name', 'Acronym', 'Class', 'Section', 'School', 'Status', 'Inserted Date', 'Specializations Count', 'Students Count'],
          rows: streams.map(s => [
            s.name,
            s.acronym || 'N/A',
            s.className || 'N/A',
            s.classSection || 'N/A',
            s.schoolName || 'N/A',
            status(s.isActive),
            fmtDate(s.insertedDate),
            this.specializations.filter(sp => sp.streamId === s.id).length,
            this.students.filter(st => st.streamId === s.id).length,
          ]),
        };
      case 'specializations':
        return {
          title: 'Specializations Report',
          headers: ['Specialization Name', 'Stream', 'Class', 'Section', 'School', 'Status', 'Inserted Date', 'Students Count'],
          rows: specializations.map(sp => [
            sp.name,
            sp.streamName || 'N/A',
            sp.className || 'N/A',
            sp.classSection || 'N/A',
            sp.schoolName || 'N/A',
            status(sp.isActive),
            fmtDate(sp.insertedDate),
            this.students.filter(st => st.specializationId === sp.id).length,
          ]),
        };
      default:
        return {
          title: 'Students Report',
          headers: ['First Name', 'Last Name', 'Gender', 'DOB', 'Email', 'Phone', 'Board', 'School', 'Class', 'Stream', 'Specialization', 'Status', 'Created Date'],
          rows: students.map(st => [
            st.firstName || 'N/A',
            st.lastName || 'N/A',
            st.gender || 'N/A',
            fmtDate(st.dateOfBirth),
            st.email || 'N/A',
            st.phoneNumber || 'N/A',
            st.boardName || 'N/A',
            st.schoolName || 'N/A',
            `${st.className || 'N/A'}${st.classSection ? ' ' + st.classSection : ''}`,
            st.streamName || 'N/A',
            st.specializationName || 'N/A',
            status(st.isActive),
            fmtDate(st.createdAt),
          ]),
        };
    }
  }

  lineSvgPoints(): string {
    if (!this.chartData.length) {
      return '';
    }
    return this.chartData.map((item, index) => {
      const x = this.chartData.length === 1 ? 50 : (index / (this.chartData.length - 1)) * 100;
      const y = 100 - this.linePoint(item.count);
      return `${x},${y}`;
    }).join(' ');
  }

  pieChartBackground(): string {
    const total = this.pieSlices.reduce((sum, slice) => sum + slice.value, 0);
    if (!total) {
      return '#f8fafc';
    }
    const first = this.pieSlices[0];
    const second = this.pieSlices[1];
    const firstPct = Math.round((first.value / total) * 100);
    return `conic-gradient(${first.color} 0% ${firstPct}%, ${second.color} ${firstPct}% 100%)`;
  }

  barFill(count: number): number {
    return this.chartMax ? Math.max(6, Math.round((count / this.chartMax) * 100)) : 0;
  }

  chartLabel(metric: MasterMetric): string {
    return this.metricLabels[metric];
  }
}
