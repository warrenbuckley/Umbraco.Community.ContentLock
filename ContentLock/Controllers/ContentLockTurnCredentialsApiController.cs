using Asp.Versioning;
using ContentLock.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace ContentLock.Controllers;

[ApiVersion("1.0")]
[ApiExplorerSettings(GroupName = "Content Lock")]
public class ContentLockTurnCredentialsApiController : ContentLockApiControllerBase
{
    private readonly ITurnCredentialProvider? _provider;

    public ContentLockTurnCredentialsApiController(ITurnCredentialProvider? provider = null)
    {
        _provider = provider;
    }

    [HttpGet("TurnCredentials")]
    [ProducesResponseType(typeof(IceServerResponse[]), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status502BadGateway)]
    public async Task<IActionResult> GetTurnCredentialsAsync(CancellationToken ct)
    {
        if (_provider is null)
            return Ok(Array.Empty<IceServerResponse>());

        try
        {
            var credentials = await _provider.GetCredentialsAsync(ct);
            return Ok(credentials.Select(c => new IceServerResponse(c.Urls, c.Username, c.Credential)));
        }
        catch (HttpRequestException ex)
        {
            return StatusCode(StatusCodes.Status502BadGateway,
                $"TURN provider returned an error: {ex.Message}");
        }
    }
}

public record IceServerResponse(string[] Urls, string? Username, string? Credential);
