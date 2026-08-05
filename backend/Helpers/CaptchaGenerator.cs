using SkiaSharp;
using System.Security.Cryptography;
using System.Text;

namespace GuestApi.Helpers;

public static class CaptchaGenerator
{
    private const string Characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890";

    // generate captcha
    public static (string CaptchaId, string CaptchaText, string ImageBase64) GenerateCaptcha()
    {
        const int width = 180;
        const int height = 60;
        var captchaText = GenerateRandomText(6);
        var captchaId = Guid.NewGuid().ToString("N");

        using var bitmap = new SKBitmap(width, height);
        using var canvas = new SKCanvas(bitmap);
        canvas.Clear(SKColors.Black);

        using var linePaint = new SKPaint { Color = SKColors.GreenYellow, StrokeWidth = 1 };
        for (var index = 0; index < 6; index++)
        {
            canvas.DrawLine(RandomNumberGenerator.GetInt32(width), RandomNumberGenerator.GetInt32(height),
                RandomNumberGenerator.GetInt32(width), RandomNumberGenerator.GetInt32(height), linePaint);
        }

        using var textPaint = new SKPaint { Color = SKColors.LightGray, TextSize = 32, IsAntialias = true };
        canvas.DrawText(captchaText, 25, 40, textPaint);

        using var dotPaint = new SKPaint { Color = SKColors.Gray, StrokeWidth = 2 };
        for (var index = 0; index < 25; index++)
        {
            canvas.DrawPoint(RandomNumberGenerator.GetInt32(width), RandomNumberGenerator.GetInt32(height), dotPaint);
        }

        using var image = SKImage.FromBitmap(bitmap);
        using var data = image.Encode(SKEncodedImageFormat.Png, 100);
        return (captchaId, captchaText, Convert.ToBase64String(data.ToArray()));
    }

    // generate random text
    private static string GenerateRandomText(int length)
    {
        var builder = new StringBuilder(length);
        for (var index = 0; index < length; index++)
        {
            builder.Append(Characters[RandomNumberGenerator.GetInt32(Characters.Length)]);
        }

        return builder.ToString();
    }
}
