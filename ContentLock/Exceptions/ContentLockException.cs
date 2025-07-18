namespace ContentLock.Exceptions;

public class ContentLockException : Exception
{
    public ContentLockException(string message) : base(message) { }
    public ContentLockException(string message, Exception inner) : base(message, inner) { }
}