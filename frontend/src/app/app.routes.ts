import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { adminGuard } from './guards/admin.guard';

export const routes: Routes = [
  // redirect to login
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  // login page
  {
    path: 'login',
    loadComponent: () => import('./components/login/login.component').then(m => m.LoginComponent)
  },
  // signup page
  {
    path: 'signup',
    loadComponent: () => import('./components/signup/signup.component').then(m => m.SignupComponent)
  },
  // dashboard
  {
    path: 'dashboard',
    loadComponent: () => import('./components/admin/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [adminGuard]
  },
  // student dashboard (for non-admin users)
  {
    path: 'student-dashboard',
    loadComponent: () => import('./components/student/student-dashboard/student-dashboard.component').then(m => m.StudentDashboardComponent),
    canActivate: [authGuard]
  },
  // student form
  {
    path: 'submit',
    loadComponent: () => import('./components/student/student-form/student-form.component').then(m => m.StudentFormComponent),
    canActivate: [authGuard]
  },
  // my application (student-facing application review)
  {
    path: 'my-application',
    loadComponent: () => import('./components/student/my-application/my-application.component').then(m => m.MyApplicationComponent),
    canActivate: [authGuard]
  },
  // student report
  {
    path: 'admin',
    loadComponent: () => import('./components/admin/student-report/student-report.component').then(m => m.StudentReportComponent),
    canActivate: [adminGuard]
  },
  // application review (accept/reject card view)
  {
    path: 'applications',
    loadComponent: () => import('./components/admin/application-review/application-review.component').then(m => m.ApplicationReviewComponent),
    canActivate: [adminGuard]
  },
  // education board
  {
    path: 'education-board',
    loadComponent: () => import('./components/admin/education-board/education-board.component').then(m => m.EducationBoardComponent),
    canActivate: [adminGuard]
  },
  // school
  {
    path: 'school',
    loadComponent: () => import('./components/admin/school/school.component').then(m => m.SchoolComponent),
    canActivate: [adminGuard]
  },
  // classes
  {
    path: 'classes',
    loadComponent: () => import('./components/admin/classes/classes.component').then(m => m.ClassesComponent),
    canActivate: [adminGuard]
  },
  // sessions
  {
    path: 'sessions',
    loadComponent: () => import('./components/admin/sessions/sessions.component').then(m => m.SessionsComponent),
    canActivate: [adminGuard]
  },
  // streams
  {
    path: 'streams',
    loadComponent: () => import('./components/admin/streams/streams.component').then(m => m.StreamsComponent),
    canActivate: [adminGuard]
  },
  // specializations + full configuration
  {
    path: 'specializations',
    canActivate: [adminGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./components/admin/specialization/specialization.component').then(m => m.SpecializationComponent)
      },
      {
        path: 'full-configuration',
        loadComponent: () => import('./components/admin/full-configuration/full-configuration.component').then(m => m.FullConfigurationComponent)
      }
    ]
  },
  // master report
  {
    path: 'master-report',
    loadComponent: () => import('./components/admin/master-report/master-report.component').then(m => m.MasterReportComponent),
    canActivate: [adminGuard]
  }
];
