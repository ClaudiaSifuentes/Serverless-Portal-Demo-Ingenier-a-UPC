import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { v4 as uuid } from "uuid";

const client = new DynamoDBClient({});
const TABLE  = process.env.TABLE_NAME!;
const cors   = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const handler = async (event: any) => {
  const data = JSON.parse(event.body ?? "{}");

  if (!data.name || !data.date) {
    return { statusCode: 400, headers: cors,
             body: JSON.stringify({ message: "name and date required" }) };
  }

  const id = uuid();
  await client.send(new PutItemCommand({
    TableName: TABLE,
    Item: {
      PK  : { S: `EVENT#${id}` },
      name: { S: data.name },
      date: { S: data.date },
    },
  }));

  return { statusCode: 201, headers: cors, body: JSON.stringify({ id }) };
};
