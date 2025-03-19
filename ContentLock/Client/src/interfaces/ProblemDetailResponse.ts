export interface ProblemDetailResponse {

    // Error
    type: string;

    // Title
    // Unauthorized
    title: string;

    // HTTP status code such as 400 bad request
    // 400
    status: number;

    // Contains message/info about the error
    // "Only the original user who locked this content can unlock it or a super user with the unlocking permission"
    detail: string;
  }