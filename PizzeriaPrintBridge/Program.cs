// /PizzeriaPrintBridge/Program.cs
using Microsoft.AspNetCore.Mvc;
using PizzeriaPrintBridge;

var builder = WebApplication.CreateBuilder(args);

// 1. Configurar los servicios (Inyección de Dependencias)
builder.Services.AddSingleton<IPrinterService, WindowsPrinterService>();

// 2. Configurar CORS (¡MUY IMPORTANTE!)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowApp",
        policy =>
        {
            policy.WithOrigins(
                    "http://localhost", // Si pruebas en local (XAMPP)
                    "http://127.0.0.1", // Si pruebas en local
                    "null"             // Para archivos HTML abiertos localmente (file://)
                    // "https://tu-dominio-produccion.com" // <--- ¡AGREGA TU DOMINIO REAL!
                )
                .AllowAnyHeader()
                .AllowAnyMethod();
        });
});


var app = builder.Build();

// 3. Usar la política de CORS
app.UseCors("AllowApp");

// 4. Definir el endpoint /imprimir/
// Escuchará peticiones POST en http://localhost:9898/imprimir/
// <--- CAMBIO DE RUTA
app.MapPost("/imprimir/", (
    [FromBody] OrderData order, // <--- Sigue esperando el objeto 'OrderData'
    [FromServices] IPrinterService printer
) =>
{
    try
    {
        // El 'order.OrderId' viene de nuestro 'Models.cs'
        Console.WriteLine($"Recibida orden #{order.OrderId} para imprimir...");
        
        // Llama al método de impresión
        printer.Print(order);
        
        Console.WriteLine("Enviado a la impresora.");

        // Devuelve una respuesta exitosa
        // Tu JS espera 'ticket_id', así que le pasamos el order_id
        return Results.Ok(new { success = true, message = "Orden enviada a imprimir.", ticket_id = order.OrderId });
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Error procesando la impresión: {ex.Message}");
        return Results.Problem($"Error interno: {ex.Message}");
    }
});

// 5. Iniciar el servidor
var port = 9899; // <--- CAMBIO DE PUERTO
Console.WriteLine($"Iniciando Pizzeria Print Bridge en http://localhost:{port}");
app.Run($"http://localhost:{port}"); // <--- CAMBIO DE PUERTO