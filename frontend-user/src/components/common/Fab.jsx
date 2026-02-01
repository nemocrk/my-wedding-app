import { AnimatePresence, motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import rightArrow from '../../assets/illustrations/right-arrow.png';
import './Fab.css';

const Fab = ({ onClick, isFlipped, visible = true }) => {
  const { t } = useTranslation();

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          className={`wedding-fab ${isFlipped ? 'is-flipped' : 'is-front'}`}
          onClick={onClick}
          initial={{ scale: 0, opacity: 0 }}
          animate={
            isFlipped
              ? { scale: 1, opacity: 1, filter: "brightness(1) hue-rotate(0deg) saturate(1)" }
              : {
                scale: [1, 1.2, 1],
                opacity: 1,
                filter: ["hue-rotate(0deg) saturate(1)", "hue-rotate(30deg) saturate(2) brightness(.8)", "hue-rotate(0deg) saturate(1)"]
              }
          }
          transition={
            isFlipped
              ? { duration: 0.3 }
              : {
                scale: { duration: 2.5, repeat: Infinity, ease: "easeInOut" },
                filter: { duration: 2.5, repeat: Infinity, ease: "easeInOut" },
                opacity: { duration: 0.3 } // Quick fade in
              }
          }
          exit={{ scale: 0, opacity: 0 }}
          whileHover={{ scale: 1.2, transition: { duration: 0.2 } }}
          whileTap={{ scale: 0.95 }}
          aria-label={isFlipped ? t('fab.aria_label_back') : t('fab.aria_label_front')}
        >
          <motion.img
            src={rightArrow}
            alt="Navigation Arrow"
            className="fab-icon"
            animate={{
              rotate: isFlipped ? 180 : 0
            }}
            transition={{ duration: 0.4, ease: "backOut" }}
          />
        </motion.button>
      )}
    </AnimatePresence>
  );
};

export default Fab;