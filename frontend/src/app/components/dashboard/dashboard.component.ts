// DashboardComponent

import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { Subject, filter, takeUntil } from 'rxjs';
import { forkJoin } from 'rxjs';
import { SchoolBoardService } from '../../services/school-board.service';
import { SchoolService } from '../../services/school.service';
import { ClassesService } from '../../services/classes.service';
import { StreamsService } from '../../services/streams.service';
import { SpecializationService } from '../../services/specialization.service';
import { StreamRecord } from '../../models/streams.model';

type DashboardModule = {
  label: string;
  value: string;
  note: string;
  icon: string;
  color: string;
  link: string;
};
type Activity = {
  icon: string;
  color: string;
  title: string;
  detail: string;
  time: string;
  timestamp: number;
};
type StreamProgress = {
  name: string;
  count: number;
  pct: number;
  color: string;
};
type ChartPeriod = 'days' | 'weeks' | 'months';
type ChartMetric = 'schools' | 'classes' | 'streams' | 'specializations';
type ChartItem = { insertedDate?: string; name: string; detail?: string };

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  loading = true;
  chartData: { month: string; count: number; items: string[] }[] = [];
  maxYLabel = 0;
  midYLabel = 0;
  chartGrowth = 0;
  chartPeriod: ChartPeriod = 'months';
  chartMetric: ChartMetric = 'schools';
  private chartSources: Record<ChartMetric, ChartItem[]> = {
    schools: [], classes: [], streams: [], specializations: [],
  };
  modules: DashboardModule[] = [
    {
      label: 'School Boards',
      value: '00',
      note: 'Active boards',
      icon: 'bi-bank',
      color: 'blue',
      link: '/education-board',
    },
    {
      label: 'Schools',
      value: '00',
      note: 'Registered schools',
      icon: 'bi-buildings',
      color: 'amber',
      link: '/school',
    },
    {
      label: 'Classes',
      value: '00',
      note: 'Class Records',
      icon: 'bi-backpack4',
      color: 'pink',
      link: '/classes',
    },
    {
      label: 'Streams',
      value: '00',
      note: 'Streams Configuration',
      icon: 'bi-signpost-split',
      color: 'green',
      link: '/streams',
    },
    {
      label: 'Specializations',
      value: '00',
      note: 'Specializations Config',
      icon: 'bi-bookmark-star',
      color: 'purple',
      link: '/specializations',
    },
  ];
  activities: Activity[] = [];
  allActivities: Activity[] = [];
  showAllActivities = false;
  streamProgress: StreamProgress[] = [];

  // inject services for each dashboard data source
  constructor(
    private boards: SchoolBoardService,
    private schools: SchoolService,
    private classes: ClassesService,
    private streams: StreamsService,
    private specializations: SpecializationService,
    private router: Router,
  ) {}

  // on init
  ngOnInit(): void {
    this.loadData();
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      takeUntil(this.destroy$),
    ).subscribe(() => this.loadData());
  }

  // load data
  private loadData(): void {
    forkJoin({
      boards: this.boards.getSchoolBoards(),
      schools: this.schools.getSchools(),
      classes: this.classes.getClasses(),
      streams: this.streams.getStreams(),
      specializations: this.specializations.getSpecializations(),
    }).subscribe({
      next: (data) => {
        this.setDashboardData(data);
        this.loading = false;
      },
      error: (error) => {
        console.error('Unable to load dashboard data', error);
        this.loading = false;
      },
    });
  }

  // set dashboard data
  private setDashboardData(data: any): void {
    const counts = [
      data.boards.length,
      data.schools.length,
      data.classes.length,
      data.streams.length,
      data.specializations.length,
    ];
    this.modules = this.modules.map((module, index) => ({
      ...module,
      value: String(counts[index]).padStart(2, '0'),
    }));
    this.allActivities = [
      ...data.boards.map((item: any) =>
        this.activity(
          'bi-bank',
          'blue',
          'New school board added',
          item.universityName || item.name,
          item.insertedDate,
        ),
      ),
      ...data.schools.map((item: any) =>
        this.activity(
          'bi-building-add',
          'amber',
          'New school added',
          item.name,
          item.insertedDate,
        ),
      ),
      ...data.classes.map((item: any) =>
        this.activity(
          'bi-backpack4',
          'pink',
          `New class added in ${item.schoolName}`,
          `${item.name} · Section ${item.section}`,
          item.insertedDate,
        ),
      ),
      ...data.streams.map((item: any) =>
        this.activity(
          'bi-signpost-split',
          'green',
          'New stream added',
          item.name,
          item.insertedDate,
        ),
      ),
      ...data.specializations.map((item: any) =>
        this.activity(
          'bi-bookmark-star',
          'purple',
          'New specialization added',
          item.name,
          item.insertedDate,
        ),
      ),
    ]
      .filter((item: Activity) => item.timestamp > 0)
      .sort(
        (left: Activity, right: Activity) => right.timestamp - left.timestamp,
      );
    this.activities = this.allActivities.slice(0, 5);
    this.chartSources = {
      schools: data.schools.map((item: any) => ({ insertedDate: item.insertedDate, name: item.name })),
      classes: data.classes.map((item: any) => ({ insertedDate: item.insertedDate, name: item.name, detail: `Section ${item.section}${item.schoolName ? ` · ${item.schoolName}` : ''}` })),
      streams: data.streams.map((item: any) => ({ insertedDate: item.insertedDate, name: item.name, detail: item.className ? `${item.className}${item.classSection ? ` · ${item.classSection}` : ''}` : undefined })),
      specializations: data.specializations.map((item: any) => ({ insertedDate: item.insertedDate, name: item.name, detail: item.streamName || item.className })),
    };
    this.setChartData();
    this.setStreamProgress(data.streams);
  }

  // bar height
  barHeight(count: number): number {
    return this.maxYLabel ? Math.max(8, (count / this.maxYLabel) * 100) : 0;
  }

  // parse date
  private parseDate(dateStr: string): Date {
    return new Date(dateStr.endsWith('Z') ? dateStr : dateStr + 'Z');
  }

  // set period
  setChartPeriod(period: ChartPeriod): void {
    this.chartPeriod = period;
    this.setChartData();
  }

  // set metric
  setChartMetric(metric: ChartMetric): void {
    this.chartMetric = metric;
    this.setChartData();
  }

  // chart title
  get chartTitle(): string {
    return `${this.chartMetricLabel} by ${this.chartPeriod.slice(0, -1)}`;
  }

  // metric label
  get chartMetricLabel(): string {
    return ({ schools: 'Schools', classes: 'Classes', streams: 'Streams', specializations: 'Specializations' } as const)[this.chartMetric];
  }

  // metric label singular
  get chartMetricSingular(): string {
    return ({ schools: 'school', classes: 'class', streams: 'stream', specializations: 'specialization' } as const)[this.chartMetric];
  }

  // period label
  get chartPeriodLabel(): string {
    return this.chartPeriod === 'days' ? 'Last 7 days' : this.chartPeriod === 'weeks' ? 'Last 8 weeks' : 'Last 6 months';
  }

  // set chart data
  private setChartData(): void {
    const formatter = new Intl.DateTimeFormat('en-US', this.chartPeriod === 'months'
      ? { month: 'short', year: 'numeric' }
      : this.chartPeriod === 'weeks'
        ? { month: 'short', day: 'numeric' }
        : { weekday: 'short', day: 'numeric' });
    const now = new Date();
    const rangeCount = this.chartPeriod === 'weeks' ? 8 : 7;
    const weekStart = new Date(now);
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const ranges = this.chartPeriod === 'months'
      ? Array.from({ length: 6 }, (_, index) => {
          const start = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
          const end = new Date(now.getFullYear(), start.getMonth() + 1, 1);
          return { month: formatter.format(start), start, end, count: 0, items: [] as string[] };
        })
      : Array.from({ length: rangeCount }, (_, index) => {
          const daysPerRange = this.chartPeriod === 'weeks' ? 7 : 1;
          const start = new Date(this.chartPeriod === 'weeks' ? weekStart : now);
          start.setHours(0, 0, 0, 0);
          start.setDate(start.getDate() - ((rangeCount - 1 - index) * daysPerRange));
          const end = new Date(start);
          end.setDate(end.getDate() + daysPerRange);
          return {
            month: this.chartPeriod === 'weeks' ? this.formatWeekLabel(start, end) : formatter.format(start),
            start,
            end,
            count: 0,
            items: [] as string[],
          };
        });

    this.chartSources[this.chartMetric].forEach((record) => {
      if (!record.insertedDate) return;
      const date = this.parseDate(record.insertedDate);
      const item = ranges.find((range) => date >= range.start && date < range.end);
      if (item) {
        item.count++;
        item.items.push(record.detail ? `${record.name} — ${record.detail}` : record.name);
      }
    });
    this.chartData = ranges.map(({ month, count, items }) => ({ month, count, items }));
    this.maxYLabel = Math.max(...this.chartData.map((item) => item.count), 1);
    this.midYLabel = Math.ceil(this.maxYLabel / 2);
    const midpoint = Math.floor(this.chartData.length / 2);
    const previous = this.chartData
      .slice(0, midpoint)
      .reduce((total, item) => total + item.count, 0);
    const current = this.chartData
      .slice(midpoint)
      .reduce((total, item) => total + item.count, 0);
    this.chartGrowth = previous
      ? Math.round(((current - previous) / previous) * 100)
      : current
        ? 100
        : 0;
  }

  // format week label
  private formatWeekLabel(start: Date, endExclusive: Date): string {
    const end = new Date(endExclusive);
    end.setDate(end.getDate() - 1);
    const formatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
    return `${formatter.format(start)}–${formatter.format(end)}`;
  }

  // set stream progress
  private setStreamProgress(streams: StreamRecord[]): void {
    const byName = new Map<string, Set<number>>();
    for (const s of streams) {
      if (!byName.has(s.name)) byName.set(s.name, new Set());
      byName.get(s.name)!.add(s.classId);
    }
    const total = Array.from(byName.values()).reduce((sum, s) => sum + s.size, 0);
    const colors = ['blue', 'amber', 'pink', 'green', 'purple', 'teal'];
    this.streamProgress = Array.from(byName.entries())
      .sort(([, a], [, b]) => b.size - a.size)
      .map(([name, classes], i) => ({
        name,
        count: classes.size,
        pct: Math.max(2, Math.round((classes.size / total) * 100)),
        color: colors[i % colors.length],
      }));
  }

  // build activity
  private activity(
    icon: string,
    color: string,
    title: string,
    detail: string,
    insertedDate?: string,
  ): Activity {
    const timestamp = insertedDate ? this.parseDate(insertedDate).getTime() : 0;
    return {
      icon,
      color,
      title,
      detail,
      timestamp,
      time: this.timeAgo(timestamp),
    };
  }

  // time ago
  private timeAgo(timestamp: number): string {
    const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days === 1 ? '' : 's'} ago`;
  }

  // on destroy
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
