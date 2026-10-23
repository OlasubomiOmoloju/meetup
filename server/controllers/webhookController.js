
import { verifyWebhook } from "@clerk/express/webhooks";
import { sql } from "../config/db.js";

export const handleClerkWebhook = async (req, res) => {
  try {
    const evt = await verifyWebhook(req);

    const eventType = evt.type;
    const data = evt.data;

    switch (eventType) {
      case "user.created":
      case "user.updated": {
        const userId = data.id;

        // Find the primary email address
        const primaryEmail =
          data.email_addresses?.find(
            (email) => email.id === data.primary_email_address_id
          )?.email_address ||
          data.email_addresses?.[0]?.email_address ||
          "";

        // Build a name without adding "undefined"
        const name = [data.first_name, data.last_name]
          .filter(Boolean)
          .join(" ")
          .trim();

        const image = data.image_url || "";

        if (eventType === "user.created") {
          await sql`
            INSERT INTO users (id, name, email, image, plan)
            VALUES (
              ${userId},
              ${name || "User"},
              ${primaryEmail},
              ${image},
              ${"free"}
            )
            ON CONFLICT (id) DO UPDATE SET
              email = COALESCE(
                NULLIF(EXCLUDED.email, ''),
                users.email
              ),
              name = COALESCE(
                NULLIF(EXCLUDED.name, 'User'),
                users.name
              ),
              image = EXCLUDED.image,
              updated_at = NOW()
          `;
        } else {
          await sql`
            INSERT INTO users (id, name, email, image)
            VALUES (
              ${userId},
              ${name || "User"},
              ${primaryEmail},
              ${image}
            )
            ON CONFLICT (id) DO UPDATE SET
              email = COALESCE(
                NULLIF(EXCLUDED.email, ''),
                users.email
              ),
              name = COALESCE(
                NULLIF(EXCLUDED.name, 'User'),
                users.name
              ),
              image = EXCLUDED.image,
              updated_at = NOW()
          `;
        }

        console.log(`Clerk user synced: ${userId}, name: ${name || "User"}`);
        break;
      }

      case "user.deleted": {
        const userId = data.id;

        if (userId) {
          await sql`DELETE FROM users WHERE id = ${userId}`;
        }

        break;
      }

      default:
        console.log(`Unhandled Clerk webhook event type: ${eventType}`);
    }

    return res.status(200).json({ success: eventType });
  } catch (err) {
    console.error("Error processing Clerk webhook:", err);
    return res.status(400).json({
      error: "Webhook processing failed",
    });
  }
};
