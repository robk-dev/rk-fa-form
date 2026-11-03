"""Build and deploy using an authenticated Azure CLI session; never print storage keys."""
import datetime
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import time
import urllib.request
import urllib.error
import zipfile

ROOT = Path(__file__).resolve().parent.parent
GROUP = APP = 'rk-fa-form'
ACCOUNT = 'storageaccountrkfafaa40'
SUBSCRIPTION = '3e8bfa84-84d2-40fb-bc36-a6571a89975d'

def az(*args, read=False, env=None):
    result = subprocess.run(['az', *args, '--subscription', SUBSCRIPTION,
                             '--only-show-errors', '-o', 'json' if read else 'none'],
                            check=True, stdout=subprocess.PIPE, env=env)
    return json.loads(result.stdout) if read else None

subprocess.run(['npm', 'test'], cwd=ROOT, check=True)
with tempfile.TemporaryDirectory(prefix='rk-fa-form-deploy-') as folder:
    stage = Path(folder) / 'app'
    stage.mkdir()
    shutil.copytree(ROOT / 'dist', stage / 'dist')
    for name in ['package.json', 'package-lock.json', 'host.json']:
        shutil.copy2(ROOT / name, stage / name)
    subprocess.run(['npm', 'ci', '--omit=dev', '--ignore-scripts'], cwd=stage, check=True)
    archive = Path(folder) / 'function.zip'
    with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as output:
        for file in stage.rglob('*'):
            if file.is_file(): output.write(file, file.relative_to(stage))
    release = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%S%fZ') + '.zip'
    env = os.environ.copy()
    env['AZURE_STORAGE_ACCOUNT'] = ACCOUNT
    env['AZURE_STORAGE_KEY'] = az('storage', 'account', 'keys', 'list', '-g', GROUP, '-n', ACCOUNT, read=True)[0]['value']
    az('storage', 'blob', 'upload', '--container-name', 'function-releases', '--name', release,
       '--file', str(archive), '--overwrite', 'false', env=env)
    az('functionapp', 'config', 'set', '-g', GROUP, '-n', APP, '--linux-fx-version', 'NODE|22')
    settings = {
        'FUNCTIONS_EXTENSION_VERSION': '~4', 'FUNCTIONS_WORKER_RUNTIME': 'node',
        'WEBSITE_RUN_FROM_PACKAGE': f'https://{ACCOUNT}.blob.core.windows.net/function-releases/{release}',
        'WEBSITE_RUN_FROM_PACKAGE_BLOB_MI_RESOURCE_ID': 'SystemAssigned',
        'CONTACT_STORAGE_URL': f'https://{ACCOUNT}.blob.core.windows.net',
        'REDIRECT_URL': 'https://www.robk.dev/?contact=sent#contact',
    }
    settings_file = Path(folder) / 'settings.json'
    settings_file.write_text(json.dumps(settings))
    settings_file.chmod(0o600)
    az('functionapp', 'config', 'appsettings', 'set', '-g', GROUP, '-n', APP, '--settings', '@' + str(settings_file))
    az('functionapp', 'config', 'appsettings', 'delete', '-g', GROUP, '-n', APP, '--setting-names', 'DB_URL')
    az('functionapp', 'update', '-g', GROUP, '-n', APP, '--set', 'httpsOnly=true')
    az('functionapp', 'restart', '-g', GROUP, '-n', APP)
    print('Deployed private package:', release)
    for attempt in range(18):
        try:
            urllib.request.urlopen(f'https://{APP}.azurewebsites.net/api/contact-form', timeout=10)
        except urllib.error.HTTPError as error:
            if error.code == 405:
                break
        except (urllib.error.URLError, TimeoutError):
            pass
        time.sleep(10)
    else:
        raise RuntimeError('Function did not become ready; inspect host logs before retrying.')
    az('rest', '--method', 'post', '--url',
       f'https://management.azure.com/subscriptions/{SUBSCRIPTION}/resourceGroups/{GROUP}/providers/Microsoft.Web/sites/{APP}/syncfunctiontriggers?api-version=2024-04-01')
    print('Host ready and triggers synchronized. Verify submission persistence after deployment.')
