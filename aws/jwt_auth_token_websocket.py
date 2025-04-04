import os
import jwt
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

JWT_SECRET = os.environ['JWT_SECRET']

def lambda_handler(event, context):
    logger.info(f"Received event: {event}")
    
    headers = event.get('headers') or {}
    method_arn = event.get('methodArn')
    
    auth_header = headers.get('Authorization') or headers.get('authorization')

    if not auth_header:
        logger.warning("Authorization header missing")
        raise Exception('Unauthorized')

    if auth_header.lower().startswith('bearer '):
        token = auth_header[7:]
    else:
        token = auth_header

    try:
        decoded = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
        user_id = decoded.get('user_id')

        if not user_id:
            raise Exception("Unauthorized")

        # Aqui, não filtramos por ARN específico pois a única rota é $connect
        effect = 'Allow'

        return generate_policy(principal_id=user_id, effect=effect, resource=method_arn)

    except jwt.ExpiredSignatureError:
        logger.warning("Token expired")
        raise Exception('Unauthorized')
    except jwt.InvalidTokenError as e:
        logger.warning(f"Invalid token: {e}")
        raise Exception('Unauthorized')
    except Exception as e:
        logger.error(f"Authorization error: {e}")
        raise Exception('Unauthorized')

def generate_policy(principal_id, effect, resource):
    return {
        'principalId': principal_id,
        'policyDocument': {
            'Version': '2012-10-17',
            'Statement': [{
                'Action': 'execute-api:Invoke',
                'Effect': effect,
                'Resource': resource
            }]
        },
        'context': {
            'userId': principal_id
        }
    }
