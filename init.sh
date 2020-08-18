#! /bin/bash
rm -rf *
git clone https://github.com/hemchander23/glitch-fdk-base.git
mv /app/glitch-fdk-base/{.[!.],}* /app
rm -rf /app/glitch-fdk-base
refresh