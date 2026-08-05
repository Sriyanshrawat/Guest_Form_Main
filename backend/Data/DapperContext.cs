using MySqlConnector;

namespace GuestApi.Data
{
    public class DapperContext
    {
        private readonly string _connectionString;

        public DapperContext(IConfiguration configuration)
        {
            _connectionString = configuration.GetConnectionString("DefaultConnection")
                ?? throw new InvalidOperationException("'DefaultConnection' is missing from configuration.");
        }

        // open connection
        public MySqlConnection CreateConnection() => new(_connectionString);
    }
}
