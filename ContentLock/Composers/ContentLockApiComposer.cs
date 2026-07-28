using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.AspNetCore.OpenApi;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.OpenApi;
using Umbraco.Cms.Core.Composing;
using Umbraco.Cms.Core.DependencyInjection;
using Umbraco.Cms.Api.Common.OpenApi;
using Umbraco.Cms.Api.Management.OpenApi;
using ContentLock.Interfaces;
using ContentLock.Services;

namespace ContentLock.Composers
{
    public class ContentLockApiComposer : IComposer
    {
        public void Compose(IUmbracoBuilder builder)
        {
            // Service
            builder.Services.AddScoped<IContentLockService, ContentLockService>();

            // Related documentation:
            // https://docs.umbraco.com/umbraco-cms/tutorials/creating-a-backoffice-api
            // https://docs.umbraco.com/umbraco-cms/tutorials/creating-a-backoffice-api/adding-a-custom-swagger-document
            // https://docs.umbraco.com/umbraco-cms/tutorials/creating-a-backoffice-api/versioning-your-api
            // https://docs.umbraco.com/umbraco-cms/tutorials/creating-a-backoffice-api/access-policies

            // Add a new OpenAPI document solely for our own package that can be browsed via the OpenAPI UI
            // Along with having a generated openapi JSON file that we can use to auto generate a TypeScript client
            builder.AddBackOfficeOpenApiDocument(
                Constants.ApiName,
                document => document
                    .WithTitle("Content Lock Backoffice API")
                    .WithBackOfficeAuthentication()
                    .WithJsonOptions(Umbraco.Cms.Core.Constants.JsonOptionsNames.BackOffice)
                    .ConfigureOpenApiOptions(options =>
                    {
                        options.AddDocumentTransformer((doc, _, _) =>
                        {
                            doc.Info.Version = "1.0";
                            doc.Info.Contact = new OpenApiContact
                            {
                                Name = "Warren Buckley",
                                Email = "warren@hackmakedo.com",
                                Url = new Uri("https://hackmakedo.com")
                            };
                            return Task.CompletedTask;
                        });

                        // Generate nice operation IDs in our openapi json file
                        // So that the generated TypeScript client has nice method names and not too verbose
                        // https://docs.umbraco.com/umbraco-cms/tutorials/creating-a-backoffice-api/umbraco-schema-and-operation-ids#operation-ids
                        options.AddOperationTransformer<ContentLockOperationIdTransformer>();
                    }));
        }

        public class ContentLockOperationIdTransformer : IOpenApiOperationTransformer
        {
            public Task TransformAsync(OpenApiOperation operation, OpenApiOperationTransformerContext context, CancellationToken cancellationToken)
            {
                if (context.Description.ActionDescriptor is ControllerActionDescriptor controllerActionDescriptor &&
                    controllerActionDescriptor.ControllerTypeInfo.Namespace?.StartsWith("ContentLock.Controllers", StringComparison.InvariantCultureIgnoreCase) is true)
                {
                    operation.OperationId = $"{controllerActionDescriptor.RouteValues["action"]}";
                }

                return Task.CompletedTask;
            }
        }
    }
}
