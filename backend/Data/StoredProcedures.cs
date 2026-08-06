namespace GuestApi.Data
{
    public static class StoredProcedures
    {
        // USERS / AUTH
        public const string Users_GetByUsername = "sp_Users_GetByUsername";
        public const string Users_UsernameExists = "sp_Users_UsernameExists";
        public const string Users_Create = "sp_Users_Create";
        public const string Users_UpdatePassword = "sp_Users_UpdatePassword";

        // SCHOOL BOARDS
        public const string SchoolBoard_GetAll = "sp_SchoolBoard_GetAll";
        public const string SchoolBoard_NameExists = "sp_SchoolBoard_NameExists";
        public const string SchoolBoard_GetById = "sp_SchoolBoard_GetById";
        public const string SchoolBoards_ActiveSchoolsCount = "sp_SchoolBoards_ActiveSchoolsCount";
        public const string SchoolBoard_Create = "sp_SchoolBoard_Create";
        public const string SchoolBoard_Update = "sp_SchoolBoard_Update";
        public const string SchoolBoard_Delete = "sp_SchoolBoard_Delete";

        // SCHOOLS
        public const string School_GetAll = "sp_School_GetAll";
        public const string School_BoardExists = "sp_School_BoardExists";
        public const string School_Exists = "sp_School_Exists";
        public const string School_GetById = "sp_School_GetById";
        public const string Schools_ActiveClassesCount = "sp_Schools_ActiveClassesCount";
        public const string School_Create = "sp_School_Create";
        public const string School_Update = "sp_School_Update";
        public const string School_Delete = "sp_School_Delete";

        // CLASSES
        public const string Class_GetAll = "sp_Class_GetAll";
        public const string Class_SchoolExists = "sp_Class_SchoolExists";
        public const string Class_Exists = "sp_Class_Exists";
        public const string Class_GetById = "sp_Class_GetById";
        public const string Class_GetNameById = "sp_Class_GetNameById";
        public const string Classes_ActiveStreamsCount = "sp_Classes_ActiveStreamsCount";
        public const string Classes_ActiveSpecializationsCount = "sp_Classes_ActiveSpecializationsCount";
        public const string Classes_ActiveStudentsCount = "sp_Classes_ActiveStudentsCount";
        public const string Class_Create = "sp_Class_Create";
        public const string Class_Update = "sp_Class_Update";
        public const string Class_Delete = "sp_Class_Delete";

        // SESSIONS
        public const string Session_GetAll = "sp_Session_GetAll";
        public const string Session_NameExists = "sp_Session_NameExists";
        public const string Session_GetById = "sp_Session_GetById";
        public const string Sessions_ActiveClassesCount = "sp_Sessions_ActiveClassesCount";
        public const string Sessions_ActiveStudentsCount = "sp_Sessions_ActiveStudentsCount";
        public const string Session_Create = "sp_Session_Create";
        public const string Session_Update = "sp_Session_Update";
        public const string Session_Delete = "sp_Session_Delete";

        // STREAMS
        public const string Stream_GetAll = "sp_Stream_GetAll";
        public const string Stream_ClassExists = "sp_Stream_ClassExists";
        public const string Stream_Exists = "sp_Stream_Exists";
        public const string Stream_GetById = "sp_Stream_GetById";
        public const string Streams_ActiveStudentsCount = "sp_Streams_ActiveStudentsCount";
        public const string Stream_Create = "sp_Stream_Create";
        public const string Stream_Update = "sp_Stream_Update";
        public const string Stream_Delete = "sp_Stream_Delete";

        // SPECIALIZATIONS
        public const string Specialization_GetAll = "sp_Specialization_GetAll";
        public const string Specialization_IsEligibleClass = "sp_Specialization_IsEligibleClass";
        public const string Specialization_StreamBelongsToClass = "sp_Specialization_StreamBelongsToClass";
        public const string Specialization_Exists = "sp_Specialization_Exists";
        public const string Specialization_GetById = "sp_Specialization_GetById";
        public const string Specializations_ActiveStudentsCount = "sp_Specializations_ActiveStudentsCount";
        public const string Specialization_Create = "sp_Specialization_Create";
        public const string Specialization_Update = "sp_Specialization_Update";
        public const string Specialization_Delete = "sp_Specialization_Delete";

        // LOOKUPS (shared)
        public const string Lookup_Boards = "sp_Lookup_Boards";
        public const string Lookup_Sessions = "sp_Lookup_Sessions";
        public const string Lookup_Schools = "sp_Lookup_Schools";
        public const string Lookup_Classes = "sp_Lookup_Classes";
        public const string Lookup_Streams = "sp_Lookup_Streams";
        public const string Lookup_Specializations = "sp_Lookup_Specializations";

        // STUDENTS
        public const string Student_GetAll = "sp_Student_GetAll";
        public const string Student_GetById = "sp_Student_GetById";
        public const string Student_GetMy = "sp_Student_GetMy";
        public const string Students_UserHasActiveEntry = "sp_Students_UserHasActiveEntry";
        public const string Students_EmailExists = "sp_Students_EmailExists";
        public const string Students_EmailExistsExclude = "sp_Students_EmailExistsExclude";
        public const string Student_Create = "sp_Student_Create";
        public const string Student_Update = "sp_Student_Update";
        public const string Student_Delete = "sp_Student_Delete";
        public const string Student_Approve = "sp_Student_Approve";
        public const string Student_Reject = "sp_Student_Reject";

        // FULL CONFIGURATIONS
        public const string FullConfig_DuplicateCheck = "sp_FullConfig_DuplicateCheck";
        public const string FullConfig_GetSaved = "sp_FullConfig_GetSaved";
        public const string FullConfig_GetById = "sp_FullConfig_GetById";
        public const string FullConfig_Create = "sp_FullConfig_Create";
        public const string FullConfig_Update = "sp_FullConfig_Update";
        public const string FullConfig_Delete = "sp_FullConfig_Delete";

        // SHARED HELPERS
        public const string Session_ActiveExists = "sp_Session_ActiveExists";
        public const string School_ActiveExists = "sp_School_ActiveExists";
        public const string Streams_ConcatByClass = "sp_Streams_ConcatByClass";
        public const string Specializations_ConcatByClass = "sp_Specializations_ConcatByClass";
    }
}
